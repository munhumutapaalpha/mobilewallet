/******************************************************************************
 * Copyright © 2013-2016 The Nxt Core Developers.                             *
 * Copyright © 2016-2020 Jelurida IP B.V.                                     *
 *                                                                            *
 * See the LICENSE.txt file at the top-level directory of this distribution   *
 * for licensing information.                                                 *
 *                                                                            *
 * Unless otherwise agreed in a custom licensing agreement with Jelurida B.V.,*
 * no part of this software, including this file, may be copied, modified,    *
 * propagated, or distributed except according to the terms contained in the  *
 * LICENSE.txt file.                                                          *
 *                                                                            *
 * Removal or modification of this copyright notice is prohibited.            *
 *                                                                            *
 ******************************************************************************/

/**
 * @depends {nrs.js}
 */
NRS.onSiteBuildDone().then(() => {
	NRS = (function(NRS, $, undefined) {

		var lastTransactions = ""; // latest confirmed transactions used for duplicate checks
		var unconfirmedTransactions = []; // current view of the unconfirmed transactions data
		var unconfirmedTransactionIds = ""; // concatenated list of unconfirmed transaction ids
		var unconfirmedTransactionsChange = true; // flag that there is a change in the list of unconfirmed transactions

		let nextBlockTimer = undefined;

		/**
		 * Notification of possible new transactions
		 * @param transactions contains both confirmed and unconfirmed transactions
		 * @param confirmedTransactionIds dual use, if there is no new block "false", otherwise lists new transactions in the block
		 */
		NRS.handleIncomingTransactions = async function(transactions, confirmedTransactionIds) {
			var isNewBlock = (confirmedTransactionIds !== false); // we pass false instead of an [] in case there is no new block
			if (typeof confirmedTransactionIds != "object") {
				confirmedTransactionIds = [];
			}
			if (confirmedTransactionIds.length) {
				lastTransactions = confirmedTransactionIds.toString();
			}
			if (confirmedTransactionIds.length || unconfirmedTransactionsChange) {
				transactions.sort(NRS.sortArray);
			}

			//Bug with popovers staying permanent when being open
			$('div.popover:not(.tour)').hide();
			$('.td_transaction_phasing div.show_popover').popover('hide');

			//always refresh peers and unconfirmed transactions..
			if (NRS.currentPage == "peers") {
				NRS.incoming.peers();
			} else if (NRS.currentPage == "transactions" && $('#transactions_type_navi').find('li.active a').attr('data-transaction-type') == "unconfirmed") {
				NRS.incoming.transactions();
			} else {
				if (NRS.currentPage != 'messages' && (isNewBlock || unconfirmedTransactionsChange)) {
					if (NRS.incoming[NRS.currentPage]) {
						NRS.incoming[NRS.currentPage](transactions);
					}
				}
			}
			if (isNewBlock || unconfirmedTransactionsChange) {
				// always call incoming for messages to enable message notifications
				NRS.incoming['messages'](transactions);
				NRS.updateNotifications();
				NRS.setPhasingNotifications();
				NRS.setShufflingNotifications();
			}
			if (isNewBlock) {
				NRS.getAccountBalances(function() {
					NRS.updateAccountBalances();
				});
			}
		};

		NRS.updateTimeToNextBlock = async function() {
			let response = await NRS.sendRequestAndWait("getNextBlockGenerators", { "limit": 10 });
			if (response && response.generators) {
				let lastBlockTime = response.timestamp;
				let generator;
				for (let i=0; response.generators.length; i++) {
					generator = response.generators[i];
					let timeToNextBlock = NRS.getEstimatedNextBlockTime(generator.deadline, lastBlockTime);
					if (timeToNextBlock >= 0) {
						break;
					}
					NRS.logConsole(`Generator ${generator.accountRS} missed his turn`);
				}
				if (nextBlockTimer) {
					clearInterval(nextBlockTimer);
				}
				if (generator === undefined) {
					NRS.logConsole("Cannot update time to next block");
					return;
				}
				nextBlockTimer = setInterval(() => {
					let timeToNextBlock = NRS.getEstimatedNextBlockTime(generator.deadline, lastBlockTime);
					if (timeToNextBlock >= 1) {
						let msg = $.t("next_block_time", {seconds: timeToNextBlock});
						$("#sidebar_next_block_time").text(msg);
					} else if (timeToNextBlock >= -1) {
						let msg = $.t("next_block_expected_soon");
						$("#sidebar_next_block_time").text(msg);
					} else if (timeToNextBlock === -2) {
						if (NRS.isPollGetState() && !NRS.downloadingBlockchain) {
							clearInterval(nextBlockTimer);
							NRS.getState();
						}
					} else {
						clearInterval(nextBlockTimer);
					}
				}, 1000);
			}
		}

		/**
		 * Load unconfirmed transactions from the server, prepare them for presentation and update the various data structures
		 * @param callback the callback to invoke
		 */
		NRS.loadUnconfirmedTransactions = function(callback) {
			NRS.sendRequest("getUnconfirmedTransactions", {
				"account": NRS.account,
				"firstIndex": 0,
				"lastIndex": NRS.itemsPerPage
			}, function(response) {
				if (response.unconfirmedTransactions && response.unconfirmedTransactions.length) {
					var transactions = [];
					var transactionIds = [];

					response.unconfirmedTransactions.sort(function(x, y) {
						return y.timestamp - x.timestamp;
					});

					for (var i = 0; i < response.unconfirmedTransactions.length; i++) {
						var transaction = response.unconfirmedTransactions[i];
						transaction.confirmed = false;
						transaction.unconfirmed = true;
						transaction.confirmations = "/";

						if (transaction.attachment) {
							for (var key in transaction.attachment) {
								if (!transaction.attachment.hasOwnProperty(key)) {
									continue;
								}
								if (!transaction.hasOwnProperty(key)) {
									transaction[key] = transaction.attachment[key]; // Flatten the attachments
								}
							}
						}
						transactions.push(transaction);
						transactionIds.push(transaction.fullHash);
					}
					unconfirmedTransactions = transactions;
					var transactionIdString = transactionIds.toString();
					if (transactionIdString != unconfirmedTransactionIds) {
						unconfirmedTransactionsChange = true;
						unconfirmedTransactionIds = transactionIdString;
						NRS.setUnconfirmedNotifications();
					} else {
						unconfirmedTransactionsChange = false;
					}
					if (callback) {
						callback(transactions);
					}
				} else {
					unconfirmedTransactions = [];
					if (unconfirmedTransactionIds) {
						unconfirmedTransactionsChange = true;
						NRS.setUnconfirmedNotifications();
					} else {
						unconfirmedTransactionsChange = false;
					}
					unconfirmedTransactionIds = "";
					if (callback) {
						callback([]);
					}
				}
			});
		};

		/**
		 * Init the dashboard during scanning and initialization
		 */
		NRS.getInitialTransactions = function() {
			NRS.sendRequest("getBlockchainTransactions", {
				"account": NRS.account,
				"firstIndex": 0,
				"lastIndex": 9
			}, function(response) {
				if (response.transactions && response.transactions.length) {
					var transactions = [];
					var transactionIds = [];

					for (var i = 0; i < response.transactions.length; i++) {
						var transaction = response.transactions[i];
						transaction.confirmed = true;
						transactions.push(transaction);
						transactionIds.push(transaction.fullHash);
					}
					NRS.loadUnconfirmedTransactions(function() {
						NRS.loadPage('dashboard');
					});
				} else {
					NRS.loadUnconfirmedTransactions(function() {
						NRS.loadPage('dashboard');
					});
				}
			});
		};

		/**
		 * Load confirmed transactions from a new block and add unconfirmed transaction on top
		 */
		NRS.getNewTransactions = function() {
			if (!NRS.blocks[0]) {
				return;
			}
			//check if there are new transactions in the new blocks
			NRS.sendRequest("getBlockchainTransactions", {
				"account": NRS.account,
				"timestamp": Math.max(NRS.blocks[0].timestamp + 1, 0),
				"firstIndex": 0,
				"lastIndex": 0
			}, function(response) {
				// if there is, get latest 10 transactions
				if (response.transactions && response.transactions.length) {
					NRS.sendRequest("getBlockchainTransactions", {
						"account": NRS.account,
						"firstIndex": 0,
						"lastIndex": 9
					}, function(response) {
						if (response.transactions && response.transactions.length) {
							var transactionIds = [];
							$.each(response.transactions, function(key, transaction) {
								transactionIds.push(transaction.fullHash);
								response.transactions[key].confirmed = true;
							});

							NRS.loadUnconfirmedTransactions(function(transactions) {
								NRS.handleIncomingTransactions(response.transactions.concat(transactions), transactionIds);
							});
						} else {
							NRS.loadUnconfirmedTransactions(function(transactions) {
								NRS.handleIncomingTransactions(transactions);
							});
						}
					});
				} else {
					NRS.loadUnconfirmedTransactions(function(transactions) {
						NRS.handleIncomingTransactions(transactions);
					});
				}
			});
		};

		/**
		 * Add unconfirmed transaction after submitting a form and receiving a confirmation of a new transaction
		 * @param fullHash the transaction full hash
		 * @param callback the callback function
		 */
		NRS.addUnconfirmedTransaction = function(fullHash, callback) {
			NRS.sendRequest("getTransaction", {
				"fullHash": fullHash
			}, function(response) {
				if (!response.errorCode) {
					response.confirmations = "/";
					response.confirmed = false;
					response.unconfirmed = true;

					if (response.attachment) {
						for (var key in response.attachment) {
							if (!response.attachment.hasOwnProperty(key)) {
								continue;
							}
							if (!response.hasOwnProperty(key)) {
								response[key] = response.attachment[key]; // flatten the attachment
							}
						}
					}
					var alreadyProcessed = false;
					try {
						var regex = new RegExp("(^|,)" + fullHash + "(,|$)");
						if (regex.exec(lastTransactions)) {
							alreadyProcessed = true;
						} else {
							$.each(unconfirmedTransactions, function(key, unconfirmedTransaction) {
								if (unconfirmedTransaction.fullHash == fullHash) {
									alreadyProcessed = true;
									return false;
								}
							});
						}
					} catch (e) {
						NRS.logConsole(e.message);
					}

					if (!alreadyProcessed) {
						unconfirmedTransactions.unshift(response);
						var transactions = [];
						for (var i=0; i<unconfirmedTransactions.length; i++) {
							transactions.push(unconfirmedTransactions[i].fullHash);
						}
						unconfirmedTransactionIds = transactions.toString();
						unconfirmedTransactionsChange = true;
					}
					if (callback) {
						callback(alreadyProcessed);
					}
					if (NRS.currentPage == 'transactions' || NRS.currentPage == 'dashboard') {
						$('div.popover:not(.tour)').hide();
						$('.td_transaction_phasing div.show_popover').popover('hide');
						NRS.incoming[NRS.currentPage]();
					}

					NRS.getAccountInfo();
				} else if (callback) {
					callback(false);
				}
			});
		};

		function getSelectedUnconfirmedTransactions(chain, type, subtype) {
			var transactions = [];
			for (var i = 0; i < unconfirmedTransactions.length; i++) {
				var transaction = unconfirmedTransactions[i];
				if (chain == transaction.chain && type == transaction.type && (subtype == transaction.subtype || subtype == -1)) {
					transactions.push(transaction);
				}
			}
			return transactions;
		}

		NRS.hasTransactionUpdates = function (transactions) {
			return transactions && transactions.length || unconfirmedTransactionsChange;
		};

		NRS.getUnconfirmedTransactionsCount = function() {
			return unconfirmedTransactions.length;
		};

		NRS.sortArray = function(a, b) {
			return b.timestamp - a.timestamp;
		};

		NRS.getTransactionIconHTML = function(type, subtype) {
			var iconHTML = NRS.transactionTypes[type]['iconHTML'] + " " + NRS.transactionTypes[type]['subTypes'][subtype]['iconHTML'];
			var tooltip = $.t(NRS.transactionTypes[type].subTypes[subtype].i18nKeyTitle);
			return '<span title="' + tooltip + '" class="label label-primary" style="font-size:12px;">' + iconHTML + '</span>';
		};

		NRS.addPhasedTransactionHTML = async function(t) {
			var $tr = $('.tr_transaction_' + t.fullHash + ':visible');
			var $tdPhasing = $tr.find('.td_transaction_phasing');
			var $approveBtn = $tr.find('.td_transaction_actions .approve_transaction_btn');

			if (t.attachment && t.attachment["version.Phasing"] && t.attachment.phasingVotingModel != undefined) {
				let responsePoll = await NRS.sendRequestAndWait("getPhasingPoll", {
					"transactionFullHash": t.fullHash,
					"countVotes": true
				});
				if (responsePoll.transactionFullHash) {
					let responseVote = await NRS.sendRequestAndWait("getPhasingPollVote", {
						"transactionFullHash": t.fullHash,
						"account": NRS.accountRS
					});
					var attachment = t.attachment;
					var vm = attachment.phasingVotingModel;
					var minBalance = parseFloat(attachment.phasingMinBalance);
					var mbModel = attachment.phasingMinBalanceModel;

					if ($approveBtn) {
						var disabled = false;
						var transactions = unconfirmedTransactions;
						if (transactions) {
							for (var i = 0; i < transactions.length; i++) {
								var ut = transactions[i];
								if (ut.attachment && ut.attachment["version.PhasingVoteCasting"] && ut.attachment.transactionFullHashes && ut.attachment.transactionFullHashes.length > 0) {
									if (ut.attachment.transactionFullHashes[0] == t.fullHash) {
										disabled = true;
										$approveBtn.attr('disabled', true);
									}
								}
							}
						}
						if (!disabled) {
							if (responseVote.transactionFullHash) {
								$approveBtn.attr('disabled', true);
							} else {
								$approveBtn.attr('disabled', false);
							}
						}
					}

					if (!responsePoll.result) {
						responsePoll.result = 0;
					}

					var state = "";
					var color = "";
					var icon = "";
					var minBalanceFormatted = "";
					var finished = attachment.phasingFinishHeight <= NRS.lastBlockHeight;
					var finishHeightFormatted = String(attachment.phasingFinishHeight);
					var percentageFormatted = attachment.phasingQuorum > 0 ? NRS.calculatePercentage(responsePoll.result, attachment.phasingQuorum, 0) + "%" : "";
					var percentageProgressBar = attachment.phasingQuorum > 0 ? Math.round(responsePoll.result * 100 / attachment.phasingQuorum) : 0;
					var progressBarWidth = Math.round(percentageProgressBar / 2);
					var approvedFormatted;
					if (responsePoll.approved || attachment.phasingQuorum == 0) {
						approvedFormatted = $.t("yes");
					} else {
						approvedFormatted = $.t("no");
					}
					var canFinishEarlyFormatted;
					if (responsePoll.canFinishEarly) {
						canFinishEarlyFormatted = $.t("yes");
					} else {
						canFinishEarlyFormatted = $.t("no");
					}

					if (finished) {
						if (responsePoll.approved) {
							state = "success";
							color = "#00a65a";
						} else {
							state = "danger";
							color = "#f56954";
						}
					} else {
						state = "warning";
						color = "#f39c12";
					}

					var $popoverTable = $("<table class='table table-striped'></table>");
					var $popoverTypeTR = $("<tr><td></td><td></td></tr>");
					var $popoverVotesTR = $("<tr><td>" + $.t('votes', 'Votes') + ":</td><td></td></tr>");
					var $popoverPercentageTR = $("<tr><td>" + $.t('percentage', 'Percentage') + ":</td><td></td></tr>");
					var $popoverFinishTR = $("<tr><td>" + $.t('finish_height', 'Finish Height') + ":</td><td></td></tr>");
					var $popoverApprovedTR = $("<tr><td>" + $.t('approved', 'Approved') + ":</td><td></td></tr>");
					var $popoverCanFinishEarlyTR = $("<tr><td>" + $.t('can_finish_early', 'Can Finish Early') + ":</td><td></td></tr>");

					$popoverTypeTR.appendTo($popoverTable);
					$popoverVotesTR.appendTo($popoverTable);
					$popoverPercentageTR.appendTo($popoverTable);
					$popoverFinishTR.appendTo($popoverTable);
					$popoverApprovedTR.appendTo($popoverTable);
					$popoverCanFinishEarlyTR.appendTo($popoverTable);

					$popoverPercentageTR.find("td:last").html(percentageFormatted);
					$popoverFinishTR.find("td:last").html(finishHeightFormatted);
					$popoverApprovedTR.find("td:last").html(approvedFormatted);
					$popoverCanFinishEarlyTR.find("td:last").html(canFinishEarlyFormatted);

					var template = '<div class="popover" style="min-width:260px;"><div class="arrow"></div><div class="popover-inner">';
					template += '<h3 class="popover-title"></h3><div class="popover-content"><p></p></div></div></div>';

					var popoverConfig = {
						"html": true,
						"trigger": "hover",
						"placement": "top",
						"template": template
					};

					if (vm === -1) {
						icon = '<i class="far ion-load-a"></i>';
					}
					if (vm === 0) {
						icon = '<i class="far fa-users"></i>';
					}
					if (vm === 1) {
						icon = '<i class="far fa-money-bill-alt"></i>';
					}
					if (vm === 2) {
						icon = '<i class="far fa-signal"></i>';
					}
					if (vm === 3) {
						icon = '<i class="fa fa-university"></i>';
					}
					if (vm === 4) {
						icon = '<i class="far fa-thumbs-up"></i>';
					}
					if (vm === 5) {
						icon = '<i class="far fa-question"></i>';
					}
					if (vm === 6) {
						icon = '<i class="far fa-cubes"></i>';
					}
					if (vm === 7) {
						icon = '<i class="fa fa-address-card"></i>';
					}
					var phasingDiv = "";
					phasingDiv += '<div class="show_popover" style="display:inline-block;min-width:94px;text-align:left;border:1px solid #e2e2e2;background-color:#fff;padding:3px;" ';
					phasingDiv += 'data-toggle="popover" data-container="body">';
					phasingDiv += "<div class='label label-" + state + "' style='display:inline-block;margin-right:5px;'>" + icon + "</div>";

					if (vm === -1) {
						phasingDiv += '<span style="color:' + color + '">' + $.t("none") + '</span>';
					} else if (vm === 0) {
						phasingDiv += '<span style="color:' + color + '">' + String(responsePoll.result) + '</span> / <span>' + String(attachment.phasingQuorum) + '</span>';
					} else {
						phasingDiv += '<div class="progress" style="display:inline-block;height:10px;width: 50px;">';
						phasingDiv += '<div class="progress-bar progress-bar-' + state + '" role="progressbar" aria-valuenow="' + percentageProgressBar + '" ';
						phasingDiv += 'aria-valuemin="0" aria-valuemax="100" style="height:10px;width: ' + progressBarWidth + 'px;">';
						phasingDiv += '<span class="sr-only">' + percentageProgressBar + '% Complete</span>';
						phasingDiv += '</div>';
						phasingDiv += '</div> ';
					}
					phasingDiv += "</div>";
					var $phasingDiv = $(phasingDiv);
					popoverConfig["content"] = $popoverTable;
					$phasingDiv.popover(popoverConfig);
					$phasingDiv.appendTo($tdPhasing);
					let votesFormatted;
					if (vm === -1) {
						$popoverTypeTR.find("td:first").html($.t("type") + ":");
						$popoverTypeTR.find("td:last").html($.t('deferred'));
					}
					if (vm === 0) {
						$popoverTypeTR.find("td:first").html($.t('accounts', 'Accounts') + ":");
						$popoverTypeTR.find("td:last").html(String(attachment.phasingWhitelist ? attachment.phasingWhitelist.length : ""));
						votesFormatted = String(responsePoll.result) + " / " + String(attachment.phasingQuorum);
						$popoverVotesTR.find("td:last").html(votesFormatted);
					}
					if (vm === 1) {
						$popoverTypeTR.find("td:first").html($.t('accounts', 'Accounts') + ":");
						$popoverTypeTR.find("td:last").html(String(attachment.phasingWhitelist ? attachment.phasingWhitelist.length : ""));
						votesFormatted = NRS.convertToNXT(responsePoll.result) + " / " + NRS.convertToNXT(attachment.phasingQuorum) + " " + NRS.getActiveChainName();
						$popoverVotesTR.find("td:last").html(votesFormatted);
					}
					if (mbModel === 1) {
						if (minBalance > 0) {
							minBalanceFormatted = NRS.convertToNXT(minBalance) + " " + NRS.getActiveChainName();
							$approveBtn.data('minBalanceFormatted', minBalanceFormatted.escapeHTML());
						}
					}
					if (vm === 2 || mbModel === 2) {
						let phResponse = await NRS.sendRequestAndWait("getAsset", {
							"asset": attachment.phasingHolding
						});
						if (phResponse && phResponse.asset) {
							if (vm === 2) {
								$popoverTypeTR.find("td:first").html($.t('asset', 'Asset') + ":");
								$popoverTypeTR.find("td:last").html(String(phResponse.name));
								votesFormatted = NRS.convertToQNTf(responsePoll.result, phResponse.decimals) + " / ";
								votesFormatted += NRS.convertToQNTf(attachment.phasingQuorum, phResponse.decimals) + " QNT";
								$popoverVotesTR.find("td:last").html(votesFormatted);
							}
							if (mbModel === 2) {
								if (minBalance > 0) {
									minBalanceFormatted = NRS.convertToQNTf(minBalance, phResponse.decimals) + " QNT (" + phResponse.name + ")";
									$approveBtn.data('minBalanceFormatted', minBalanceFormatted.escapeHTML());
								}
							}
						}
					}
					if (vm === 3 || mbModel === 3) {
						let phResponse = await NRS.sendRequestAndWait("getCurrency", {
							"currency": attachment.phasingHolding
						});
						if (phResponse && phResponse.currency) {
							if (vm === 3) {
								$popoverTypeTR.find("td:first").html($.t('currency', 'Currency') + ":");
								$popoverTypeTR.find("td:last").html(String(phResponse.code));
								votesFormatted = NRS.convertToQNTf(responsePoll.result, phResponse.decimals) + " / ";
								votesFormatted += NRS.convertToQNTf(attachment.phasingQuorum, phResponse.decimals) + " Units";
								$popoverVotesTR.find("td:last").html(votesFormatted);
							}
							if (mbModel === 3) {
								if (minBalance > 0) {
									minBalanceFormatted = NRS.convertToQNTf(minBalance, phResponse.decimals) + " Units (" + phResponse.code + ")";
									$approveBtn.data('minBalanceFormatted', minBalanceFormatted.escapeHTML());
								}
							}
						}
					}
					if (vm === 4) {
						$popoverTypeTR.find("td:first").html($.t("transactions") + ":");
						const totalTxs = Array.isArray(responsePoll.linkedTransactions) ? responsePoll.linkedTransactions.length : "";
						$popoverTypeTR.find("td:last").html(String(totalTxs));
						votesFormatted = `${String(responsePoll.result)} / ${String(attachment.phasingQuorum)} ${$.t("transactions")}`;
						$popoverVotesTR.find("td:last").html(votesFormatted);
					}
					if (vm === 5) {
						$popoverTypeTR.find("td:first").html($.t("type") + ":");
						$popoverTypeTR.find("td:last").html($.t("hashed_secret"));
					}
					if (vm === 6) {
						$popoverTypeTR.find("td:first").html($.t("composite") + ":");
						$popoverTypeTR.find("td:last").html(String(attachment.phasingExpression));
					}
					if (vm === 7) {
						$popoverTypeTR.find("td:first").html($.t("type") + ":");
						$popoverTypeTR.find("td:last").html($.t("property"));
					}
				} else {
					$tdPhasing.html("&nbsp;");
				}
			} else {
				$tdPhasing.html("&nbsp;");
			}
		};

		NRS.addPhasingInfoToTransactionRows = function(transactions) {
			for (var i = 0; i < transactions.length; i++) {
				var transaction = transactions[i];
				NRS.addPhasedTransactionHTML(transaction);
			}
		};

		function getConfirmationData(t) {
			var ul = "<ul class='confirmations-bar-ul'>";
			var li_not_binded_pulse = "<li class='confirmations-bar-li confirmations-bar-li-not-binded confirmations-pulse'>";
			var li_binded = "<li class='confirmations-bar-li confirmations-bar-li-binded'>";
			var li_unconfirmed = "<li class='confirmations-bar-li confirmations-bar-li-unconfirmed'>";
			var li_unconfirmed_pulse = "<li class='confirmations-bar-li confirmations-bar-li-unconfirmed confirmations-pulse'>";
			var li_confirmed = "<li class='confirmations-bar-li confirmations-bar-li-confirmed'>";
			var li_confirmations_wait = "<li class='confirmations-bar-li confirmations-bar-li-confirmations-wait'>";
			var li_confirmations_wait_pulse = "<li class='confirmations-bar-li confirmations-bar-li-confirmations-wait confirmations-pulse'>";
			var li_confirmations_set = "<li class='confirmations-bar-li confirmations-bar-li-confirmations-set'>";
			var isUnconfirmed = t.confirmations == undefined || t.confirmations == "/";
			if (!t.isBinded && isUnconfirmed && t.chain != 1) {
				ul += li_not_binded_pulse;
				ul += li_unconfirmed;
				for (var i=0; i<10; i++) {
					ul += li_confirmations_wait;
				}
				ul += "</ul>";
				return ul;
			}
			if (!NRS.isParentChain()) {
				ul += li_binded;
			}
			if (isUnconfirmed) {
				ul += li_unconfirmed_pulse;
				for (i=0; i<10; i++) {
					ul += li_confirmations_wait;
				}
				ul += "</ul>";
				return ul;
			}
			if (t.confirmations < 10) {
				ul += li_confirmed;
				if (t.confirmations >= 1) {
					for (i=0; i < t.confirmations; i++) {
						ul += li_confirmations_set;
					}
				}
				ul += li_confirmations_wait_pulse;
				if (t.confirmations < 9) {
					for (i=t.confirmations+1; i<10; i++) {
						ul += li_confirmations_wait;
					}
				}
				ul += "</ul>";
				ul += "</ul>";
			} else {
				ul = t.confirmations > 1440 ? (NRS.formatAmount('144000000000', false, false, false, NRS.getChain(1).decimals) + "+") : NRS.formatAmount(t.confirmations);
			}
			return ul;
		}

		NRS.getTransactionRowHTML = function(t, actions, decimals) {
			var transactionType = $.t(NRS.transactionTypes[t.type]['subTypes'][t.subtype]['i18nKeyTitle']);
			if (NRS.isOfType(t, "AliasSell") && t.attachment.priceMTA == "0") {
				if (t.sender == NRS.account && t.recipient == NRS.account) {
					transactionType = $.t("alias_sale_cancellation");
				} else {
					transactionType = $.t("alias_transfer");
				}
			}

			var amount = "";
			var sign = 0;
			var fee = new BigInteger(t.feeMTA);
			var feeColor = "";
			var receiving = t.recipient == NRS.account && !(t.sender == NRS.account);
			if (receiving) {
				if (t.amountMTA != "0") {
					amount = new BigInteger(t.amountMTA);
					sign = 1;
				}
				feeColor = "color:black;";
			} else {
				if (t.sender != t.recipient) {
					if (t.amountMTA != "0") {
						amount = new BigInteger(t.amountMTA);
						amount = amount.negate();
						sign = -1;
					}
				} else {
					if (t.amountMTA != "0") {
						amount = new BigInteger(t.amountMTA); // send to myself
					}
				}
				feeColor = "color:red;";
			}
			var formattedAmount = "";
			if (amount != "") {
				formattedAmount = NRS.formatAmount(amount, false, false, decimals.amount, parseInt(NRS.getChainDecimals(t.chain)));
			}
			var formattedFee = NRS.formatAmount(fee, false, false, decimals.fee, parseInt(NRS.getChainDecimals(t.chain)));
			var amountColor = (sign == 1 ? "color:green;" : (sign == -1 ? "color:red;" : "color:black;"));
			var hasMessage = false;

			if (t.attachment) {
				if (t.attachment.encryptedMessage || t.attachment.message) {
					hasMessage = true;
				} else if (t.sender == NRS.account && t.attachment.encryptToSelfMessage) {
					hasMessage = true;
				}
			}

			let html = `<tr class='tr_transaction_${t.fullHash}'>
						<td style='vertical-align:middle;'>
							${NRS.getTransactionLink(NRS.escapeRespStr(t.fullHash), NRS.formatTimestamp(t.timestamp))}
						</td>
						<td class='transaction-has-message' style='vertical-align:middle;text-align:center;'>
							${(hasMessage ? "&nbsp; <i class='far fa-envelope'></i>&nbsp;" : "&nbsp;")}
						</td>
						<td class="transaction-type" style="vertical-align:middle;">${NRS.getTransactionIconHTML(t.type, t.subtype)}
							&nbsp;
							<span style="font-size:11px;display:inline-block;margin-top:5px;">${transactionType}</span>
						</td>
						<td class='transaction-amount' style='vertical-align:middle;text-align:right; ${amountColor}' ${(formattedAmount != "" ? "data-column-title='" + $.t('amount') + "'" : "")}>
							${formattedAmount}
						</td>
						<td style='vertical-align:middle;text-align:right;${feeColor}' data-column-title='${$.t("fee")}'>
							${formattedFee}
						</td>
						<td style='vertical-align:middle;'>
							${((NRS.getAccountLink(t, "sender") == "/" && t.type == 2) ? "<span style='white-space: initial'>Asset Exchange</span>" : NRS.getAccountLink(t, "sender"))} 
							<i class='fa fa-arrow-circle-right' style='color:#777;'></i>
							${((NRS.getAccountLink(t, "recipient") == "/" && t.type == 2) ? "<span style='white-space: initial'>Asset Exchange</span>" : NRS.getAccountLink(t, "recipient"))}
						</td>
						<td class='td_transaction_phasing' style='min-width:100px;vertical-align:middle;text-align:center;'></td>
						<td class='transaction-height' style='vertical-align:middle;text-align:center;'>
							${(t.confirmed ? NRS.getBlockLink(t.height, null, true) : "-")}
						</td>
						<td class='confirmations ${(!t.confirmed || t.confirmations < 10) ? "confirmations-show-bar-mobile-view" : ""}' style='vertical-align:middle;text-align:center;font-size:12px;' data-column-title='${$.t("confirmations_short")}'>
							<span class='regular-view'>${getConfirmationData(t)}</span>
							<span class='mobile-view' style='display:none;'>${(t.confirmed && t.confirmations > 10) ? NRS.getBlockLink(t.height, getConfirmationData(t), true) : getConfirmationData(t)}</span>
						</td>`;
			if (actions && actions.length != undefined) {
				html += '<td class="td_transaction_actions" style="vertical-align:middle;text-align:right;">';
				if (actions.indexOf('approve') > -1) {
					html += `<a class='btn btn-xs btn-default approve_transaction_btn' href='#' data-toggle='modal' data-target='#approve_transaction_modal'
							data-fullhash='${NRS.escapeRespStr(t.fullHash)}'
							data-chain='${NRS.escapeRespStr(t.chain)}'
							data-timestamp='${t.timestamp}'
							data-votingmodel='${t.attachment.phasingVotingModel}'
							data-fee='1' data-min-balance-formatted=''>
								${$.t('approve')}
						</a>`;
				}
				html += "</td>";
			}
			html += "</tr>";
			return html;
		};

		NRS.getLedgerEntryRow = async function (entry) {
			var linkClass;
			var dataToken;
			if (entry.isTransactionEvent) {
				linkClass = "show_transaction_modal_action";
				dataToken = "data-fullhash='" + NRS.escapeRespStr(entry.eventHash) + "'";
			} else {
				linkClass = "show_block_modal_action";
				dataToken = "data-id='1' data-block='" + NRS.escapeRespStr(entry.event)+ "'";
			}
			var change = entry.change;
			var balance = entry.balance;
			var balanceType = "nxt";
			var balanceEntity = NRS.getActiveChainName();
			var holdingIcon = "";
			if (change < 0) {
				change = String(change).substring(1);
			}
			var linkedChain = entry.chain;
			if (/ASSET_BALANCE/i.test(entry.holdingType)) {
				let response = await NRS.sendRequestAndWait("getAsset", {"asset": entry.holding});
				balanceType = "asset";
				balanceEntity = response.name;
				change = NRS.formatQuantity(change, response.decimals);
				balance = NRS.formatQuantity(balance, response.decimals);
				holdingIcon = "<i class='far fa-signal'></i> ";
			} else if (/CURRENCY_BALANCE/i.test(entry.holdingType)) {
				let response = await NRS.sendRequestAndWait("getCurrency", {"currency": entry.holding});
				balanceType = "currency";
				balanceEntity = response.name;
				change = NRS.formatQuantity(change, response.decimals);
				balance = NRS.formatQuantity(balance, response.decimals);
				holdingIcon =  "<i class='fa fa-university'></i> ";
			} else {
				linkedChain = entry.holding;
				change = NRS.formatQuantity(change, NRS.getChain(entry.holding).decimals);
				balance = NRS.formatQuantity(balance, NRS.getChain(entry.holding).decimals);
			}
			var sign = "";
			var color = "";
			if (entry.change > 0) {
				color = "color:green;";
			} else if (entry.change < 0) {
				color = "color:red;";
				sign = "-";
			}
			var eventType = NRS.escapeRespStr(entry.eventType);
			if (eventType.indexOf("ASSET") == 0 || eventType.indexOf("CURRENCY") == 0) {
				eventType = eventType.substring(eventType.indexOf("_") + 1);
			}
			eventType = $.t(eventType.toLowerCase());
			var html = "";
			html += "<tr>";
			html += "<td style='vertical-align:middle;'>";
			html += "<a class='show_ledger_modal_action' href='#' data-entry='" + NRS.escapeRespStr(entry.ledgerId) +"'";
			html += "data-change='" + (entry.change < 0 ? ("-" + change) : change) + "' data-balance='" + balance + "'>";
			html += NRS.formatTimestamp(entry.timestamp) + "</a>";
			html += "</td>";
			html += '<td style="vertical-align:middle;">';
			html += '<span style="font-size:11px;display:inline-block;margin-top:5px;">' + eventType + '</span>';
			html += "<a class='" + linkClass + "' href='#' data-timestamp='" + NRS.escapeRespStr(entry.timestamp) + "' " + dataToken + ">";
			html += " <i class='far fa-info'></i></a>";
			html += '</td>';
			html += "<td>" + NRS.getChainLink(linkedChain) + "</td>";
			if (balanceType == "nxt") {
				html += "<td style='vertical-align:middle;" + color + "' class='numeric'>" + sign + change + "</td>";
				html += "<td style='vertical-align:middle;' class='numeric'>" + balance + "</td>";
				html += "<td></td>";
				html += "<td></td>";
				html += "<td></td>";
			} else {
				html += "<td></td>";
				html += "<td></td>";
				html += "<td>" + holdingIcon + balanceEntity + "</td>";
				html += "<td style='vertical-align:middle;" + color + "' class='numeric'>" + sign + change + "</td>";
				html += "<td style='vertical-align:middle;' class='numeric'>" + balance + "</td>";
			}
			return html;
		};

		NRS.buildTransactionsTypeNavi = function() {
			var html = '';
			html += '<li role="presentation" class="active"><a href="#" data-transaction-type="" ';
			html += 'data-toggle="popover" data-placement="top" data-content="All" data-container="body" data-i18n="[data-content]all">';
			html += '<span data-i18n="all">All</span></a></li>';
			var typeNavi = $('#transactions_type_navi');
			typeNavi.append(html);

			for (var typeIndex in NRS.transactionTypes) {
				if (!NRS.transactionTypes.hasOwnProperty(typeIndex)) {
					continue;
				}
				var typeDict = NRS.transactionTypes[typeIndex];
				if (NRS.isParentChain() && typeDict.chainType == "beta" ||
					!NRS.isParentChain() && typeDict.chainType == "parent") {
					continue;
				}
				var titleString = $.t(typeDict.i18nKeyTitle);
				html = '<li role="presentation"><a href="#" data-transaction-type="' + typeIndex + '" ';
				html += 'data-toggle="popover" data-placement="top" data-content="' + titleString + '" data-container="body">';
				html += typeDict.iconHTML + '</a></li>';
				typeNavi.append(html);
			}

			html  = '<li role="presentation"><a href="#" data-transaction-type="unconfirmed" ';
			html += 'data-toggle="popover" data-placement="top" data-content="Unconfirmed (Account)" data-container="body" data-i18n="[data-content]unconfirmed_account">';
			html += '<i class="far fa-circle"></i>&nbsp; <span data-i18n="unconfirmed">Unconfirmed</span></a></li>';
			typeNavi.append(html);

			html  = '<li role="presentation"><a href="#" data-transaction-type="phasing" ';
			html += 'data-toggle="popover" data-placement="top" data-content="Phasing (Pending)" data-container="body" data-i18n="[data-content]phasing_pending">';
			html += '<i class="far fa-gavel"></i>&nbsp; <span data-i18n="phasing">Phasing</span></a></li>';
			typeNavi.append(html);

			html  = '<li role="presentation"><a href="#" data-transaction-type="all_unconfirmed" ';
			html += 'data-toggle="popover" data-placement="top" data-content="Unconfirmed (Everyone)" data-container="body" data-i18n="[data-content]unconfirmed_everyone">';
			html += '<i class="far fa-circle"></i>&nbsp; <span data-i18n="all_unconfirmed">Unconfirmed (Everyone)</span></a></li>';
			typeNavi.append(html);

			typeNavi.find('a[data-toggle="popover"]').popover({
				"trigger": "hover"
			});
			typeNavi.find("[data-i18n]").i18n();
		};

		NRS.buildTransactionsSubTypeNavi = function() {
			var subtypeNavi = $('#transactions_sub_type_navi');
			subtypeNavi.empty();
			var html  = '<li role="presentation" class="active"><a href="#" data-transaction-sub-type="">';
			html += '<span>' + $.t("all_types") + '</span></a></li>';
			subtypeNavi.append(html);

			var typeIndex = $('#transactions_type_navi').find('li.active a').attr('data-transaction-type');
			if (typeIndex && typeIndex != "unconfirmed" && typeIndex != "all_unconfirmed" && typeIndex != "phasing") {
				var typeDict = NRS.transactionTypes[typeIndex];
				$.each(typeDict["subTypes"], function(subTypeIndex, subTypeDict) {
					var subTitleString = $.t(subTypeDict.i18nKeyTitle);
					html = '<li role="presentation"><a href="#" data-transaction-sub-type="' + subTypeIndex + '">';
					html += subTypeDict.iconHTML + ' ' + subTitleString + '</a></li>';
					$('#transactions_sub_type_navi').append(html);
				});
			}
		};

		NRS.displayUnconfirmedTransactions = function(account) {
			var params = {
				"firstIndex": NRS.pageNumber * NRS.itemsPerPage - NRS.itemsPerPage,
				"lastIndex": NRS.pageNumber * NRS.itemsPerPage
			};
			if (account != "") {
				params["account"] = account;
			} else {
				params["nochain"] = true; // All unconfirmed from all chains
			}
			NRS.sendRequest("getUnconfirmedTransactions", params, function(response) {
				var rows = "";
				if (response.unconfirmedTransactions && response.unconfirmedTransactions.length) {
					var decimals = NRS.getTransactionsAmountDecimals(response.unconfirmedTransactions);
					for (var i = 0; i < response.unconfirmedTransactions.length; i++) {
						rows += NRS.getTransactionRowHTML(response.unconfirmedTransactions[i], false, decimals);
					}
				}
				NRS.dataLoaded(rows);
			});
		};

		NRS.displayPhasedTransactions = function() {
			var params = {
				"account": NRS.account,
				"firstIndex": NRS.pageNumber * NRS.itemsPerPage - NRS.itemsPerPage,
				"lastIndex": NRS.pageNumber * NRS.itemsPerPage
			};
			NRS.sendRequest("getAccountPhasedTransactions", params, function(response) {
				var rows = "";
				if (response.transactions && response.transactions.length) {
					var decimals = NRS.getTransactionsAmountDecimals(response.transactions);
					for (var i = 0; i < response.transactions.length; i++) {
						var t = response.transactions[i];
						t.confirmed = true;
						rows += NRS.getTransactionRowHTML(t, false, decimals);
					}
					NRS.dataLoaded(rows);
					NRS.addPhasingInfoToTransactionRows(response.transactions);
				} else {
					NRS.dataLoaded(rows);
				}
			});
		};

		/**
		 * Invoked when refreshing the dashboard
		 */
		NRS.pages.dashboard = function() {
			NRS.loadUnconfirmedTransactions(function(ucTransactions) {
				var rows = "";
				var ucNumber = 0;
				if (ucTransactions) {
					for (var i = 0; i < ucTransactions.length; i++) {
						if (ucTransactions[i].chain == NRS.getActiveChainId()) {
							rows += NRS.getTransactionRowHTML(ucTransactions[i], false, 2);
						}
					}
					ucNumber = ucTransactions.length;
				}
				if (ucNumber >= 10) {
					return;
				}

				NRS.sendRequest("getBlockchainTransactions+", {
					"account": NRS.account,
					"firstIndex": 0,
					"lastIndex": 9 - ucNumber
				}, function(response) {
					if (response.transactions && response.transactions.length) {
						for (var i = 0; i < response.transactions.length; i++) {
							var transaction = response.transactions[i];
							transaction.confirmed = true;
							rows += NRS.getTransactionRowHTML(transaction, false, 2);
						}
						NRS.dataLoaded(rows);
						NRS.addPhasingInfoToTransactionRows(response.transactions);
					} else {
						NRS.dataLoaded(rows);
					}
				});
			});
		};

		NRS.incoming.dashboard = function() {
			NRS.loadPage("dashboard");
		};

		NRS.pages.ledger = function() {
			var rows = "";
			var params = {
				"account": NRS.account,
				"includeHoldingInfo": true,
				"firstIndex": NRS.pageNumber * NRS.itemsPerPage - NRS.itemsPerPage,
				"lastIndex": NRS.pageNumber * NRS.itemsPerPage
			};

			NRS.sendRequest("getAccountLedger+", params, async function(response) {
				if (response.entries && response.entries.length) {
					if (response.entries.length > NRS.itemsPerPage) {
						NRS.hasMorePages = true;
						response.entries.pop();
					}
					for (var i = 0; i < response.entries.length; i++) {
						var entry = response.entries[i];
						rows += await NRS.getLedgerEntryRow(entry);
					}
				}
				NRS.dataLoaded(rows);
				if (NRS.ledgerTrimKeep > 0) {
					var ledgerMessage = $("#account_ledger_message");
					ledgerMessage.text($.t("account_ledger_message", { blocks: NRS.ledgerTrimKeep }));
					ledgerMessage.show();
				}
			});
		};

		NRS.pages.transactions = function(callback, subpage) {
			var typeNavi = $('#transactions_type_navi');
			if (typeNavi.children().length == 0) {
				NRS.buildTransactionsTypeNavi();
				NRS.buildTransactionsSubTypeNavi();
			}

			if (subpage) {
				typeNavi.find('li a[data-transaction-type="' + subpage + '"]').click();
				return;
			}

			var selectedType = typeNavi.find('li.active a').attr('data-transaction-type');
			var selectedSubType = $('#transactions_sub_type_navi').find('li.active a').attr('data-transaction-sub-type');
			if (!selectedSubType) {
				selectedSubType = "";
			}
			if (selectedType == "unconfirmed") {
				NRS.displayUnconfirmedTransactions(NRS.account);
				return;
			}
			if (selectedType == "phasing") {
				NRS.displayPhasedTransactions();
				return;
			}
			if (selectedType == "all_unconfirmed") {
				NRS.displayUnconfirmedTransactions("");
				return;
			}

			var params = {
				"account": NRS.account,
				"firstIndex": NRS.pageNumber * NRS.itemsPerPage - NRS.itemsPerPage,
				"lastIndex": NRS.pageNumber * NRS.itemsPerPage
			};
			var transactions;
			if (selectedType) {
				params.type = selectedType;
				params.subtype = selectedSubType;
				transactions = getSelectedUnconfirmedTransactions(NRS.getActiveChainId(), params.type, (params.subtype ? params.subtype : -1));
			} else {
				transactions = unconfirmedTransactions;
			}
			var decimals = NRS.getTransactionsAmountDecimals(transactions);
			var rows = "";
			for (var i = 0; i < transactions.length; i++) {
				if (transactions[i].chain == NRS.getActiveChainId()) {
					rows += NRS.getTransactionRowHTML(transactions[i], false, decimals);
				}
			}

			NRS.sendRequest("getBlockchainTransactions+", params, function(response) {
				if (response.transactions && response.transactions.length) {
					if (response.transactions.length > NRS.itemsPerPage) {
						NRS.hasMorePages = true;
						response.transactions.pop();
					}
					var decimals = NRS.getTransactionsAmountDecimals(response.transactions);
					for (var i = 0; i < response.transactions.length; i++) {
						var transaction = response.transactions[i];
						transaction.confirmed = true;
						rows += NRS.getTransactionRowHTML(transaction, false, decimals);
					}

					NRS.dataLoaded(rows);
					NRS.addPhasingInfoToTransactionRows(response.transactions);
				} else {
					NRS.dataLoaded(rows);
				}
			});
		};

		NRS.updateApprovalRequests = function() {
			var params = {
				"account": NRS.account,
				"firstIndex": 0,
				"lastIndex": 20
			};
			NRS.sendRequest("getVoterPhasedTransactions", params, function(response) {
				var $badge = $('#dashboard_link').find('.sm_treeview_submenu a[data-page="approval_requests_account"] span.badge');
				if (response.transactions && response.transactions.length) {
					if (response.transactions.length == 0) {
						$badge.hide();
					} else {
						var length;
						if (response.transactions.length == 21) {
							length = "20+";
						} else {
							length = String(response.transactions.length);
						}
						$badge.text(length);
						$badge.show();
					}
				} else {
					$badge.hide();
				}
			});
			if (NRS.currentPage == 'approval_requests_account') {
				NRS.loadPage(NRS.currentPage);
			}
		};

		NRS.pages.approval_requests_account = function() {
			var params = {
				"account": NRS.account,
				"firstIndex": NRS.pageNumber * NRS.itemsPerPage - NRS.itemsPerPage,
				"lastIndex": NRS.pageNumber * NRS.itemsPerPage
			};
			NRS.sendRequest("getVoterPhasedTransactions", params, function(response) {
				var rows = "";

				if (response.transactions && response.transactions.length) {
					if (response.transactions.length > NRS.itemsPerPage) {
						NRS.hasMorePages = true;
						response.transactions.pop();
					}
					var decimals = NRS.getTransactionsAmountDecimals(response.transactions);
					for (var i = 0; i < response.transactions.length; i++) {
						var t = response.transactions[i];
						t.confirmed = true;
						rows += NRS.getTransactionRowHTML(t, ['approve'], decimals);
					}
				}
				NRS.dataLoaded(rows);
				NRS.addPhasingInfoToTransactionRows(response.transactions);
			});
		};

		NRS.incoming.transactions = function() {
			NRS.loadPage("transactions");
		};

		NRS.setup.transactions = function() {
			var sidebarId = 'dashboard_link';
			var options = {
				"id": sidebarId,
				"titleHTML": '<i class="fa fa-tachometer-alt"></i> <span data-i18n="dashboard">Dashboard</span>',
				"page": 'dashboard',
				"desiredPosition": 10
			};
			NRS.addTreeviewSidebarMenuItem(options);
			options = {
				"titleHTML": '<span data-i18n="dashboard">Dashboard</span>',
				"type": 'PAGE',
				"page": 'dashboard'
			};
			NRS.appendMenuItemToTSMenuItem(sidebarId, options);
			options = {
				"titleHTML": '<span data-i18n="account_ledger">Account Ledger</span>',
				"type": 'PAGE',
				"page": 'ledger'
			};
			NRS.appendMenuItemToTSMenuItem(sidebarId, options);
			options = {
				"titleHTML": '<span data-i18n="account_properties">Account Properties</span>',
				"type": 'PAGE',
				"page": 'account_properties'
			};
			NRS.appendMenuItemToTSMenuItem(sidebarId, options);
			options = {
				"titleHTML": '<span data-i18n="my_transactions">My Transactions</span>',
				"type": 'PAGE',
				"page": 'transactions'
			};
			NRS.appendMenuItemToTSMenuItem(sidebarId, options);
			options = {
				"titleHTML": '<span data-i18n="approval_requests">Approval Requests</span>',
				"type": 'PAGE',
				"page": 'approval_requests_account'
			};
			NRS.appendMenuItemToTSMenuItem(sidebarId, options);
			options = {
				"titleHTML": '<span data-i18n="approval_models">Approval Models</span>',
				"type": 'PAGE',
				"page": 'approval_models'
			};
			NRS.appendMenuItemToTSMenuItem(sidebarId, options);
		};

		$(document).on("click", "#transactions_type_navi li a", function(e) {
			e.preventDefault();
			$('#transactions_type_navi').find('li.active').removeClass('active');
			$(this).parent('li').addClass('active');
			NRS.buildTransactionsSubTypeNavi();
			NRS.pageNumber = 1;
			NRS.loadPage("transactions");
		});

		$(document).on("click", "#transactions_sub_type_navi li a", function(e) {
			e.preventDefault();
			$('#transactions_sub_type_navi').find('li.active').removeClass('active');
			$(this).parent('li').addClass('active');
			NRS.pageNumber = 1;
			NRS.loadPage("transactions");
		});

		$(document).on("click", "#transactions_sub_type_show_hide_btn", function(e) {
			e.preventDefault();
			var subTypeNaviBox = $('#transactions_sub_type_navi_box');
			if (subTypeNaviBox.is(':visible')) {
				subTypeNaviBox.hide();
				$(this).text($.t('show_type_menu', 'Show Type Menu'));
			} else {
				subTypeNaviBox.show();
				$(this).text($.t('hide_type_menu', 'Hide Type Menu'));
			}
		});

		return NRS;
	}(NRS || {}, jQuery));
});
