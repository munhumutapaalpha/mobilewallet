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
	NRS = (function(NRS, $) {
		NRS.forms = {};
		NRS.displayFormWarning = {
			"amount_warning": true,
			"fee_warning": true,
			"decimal_positions_warning": true,
			"asset_transfer_warning": true,
			"currency_transfer_warning": true,
			"contract_params_warning": true
		};

		$(".modal form input").keydown(function(e) {
			if (e.which == "13") {
				e.preventDefault();
				if (NRS.settings["submit_on_enter"] && e.target.type != "textarea") {
					$(this).submit();
				} else {
					return false;
				}
			}
		});

		$("button.scan-qr-code,a.scan-qr-code").click(function() {
			let data = $(this).data();
			let $modal = $(this).closest(".modal");
			NRS.scanQRCode(data.reader, function (text) {
				if (data.id) {
					let $input = $("#" + data.id);
					$input.val(text);
					$input.change();
				} else {
					$modal.find("#" + data.result).val(text);
				}
			});
		});

		$(".modal button.btn-primary:not([data-dismiss=modal]):not([data-ignore=true]),button.btn-calculate-fee").click(function() {
			var $btn = $(this);
			var $modal = $(this).closest(".modal");
			try {
				NRS.submitForm($modal, $btn);
			} catch(e) {
				NRS.logException(e);
				var stackTrace = (e.stack ? " " + e.stack : "");
				$modal.find(".error_message").html("Form submission error '" + e.message + "' - please report to developers" + stackTrace).show();
				NRS.unlockForm($modal, $btn);
			}
		});

		$(".modal input,select,textarea").change(function() {
			var id = $(this).attr('id');
			var modal = $(this).closest(".modal");
			if (!modal) {
				return;
			}
			var feeFieldId = modal.attr('id');
			if (!feeFieldId) {
				// Not a modal dialog with fee calculation widget
				return;
			}
			feeFieldId = feeFieldId.replace('_modal', '') + "_fee";
			if (id == feeFieldId) {
				return;
			}
			var fee = $("#" + feeFieldId);
			if (fee.val() == "") {
				return;
			}
			var recalcIndicator = $("#" + modal.attr('id').replace('_modal', '') + "_recalc");
			recalcIndicator.show();
		});

		$("<span class='input-group-btn input-clear-btn'><button class='btn btn-flat'><i class='far fa-times'></i></button></span>")
			.appendTo(".input-group-clearable")
			.click(function(e) {
				e.preventDefault();
				const $input = $(this).siblings('input[type=text]');
				$input.val('');
			});

		$(".input-group-clearable input[type=text]").on("keyup", function(e) {
			if (e.keyCode === 27) {
				$(this).val('');
			}
		});

		function getSuccessMessage(requestType) {
			var ignore = ["asset_exchange_change_group_name", "asset_exchange_group", "add_contact", "update_contact", "delete_contact",
				"send_message", "decrypt_messages", "start_forging", "stop_forging", "generate_token", "send_money", "set_alias", "add_asset_bookmark", "sell_alias"
			];

			if (ignore.indexOf(requestType) != -1) {
				return "";
			} else {
				var key = "success_" + requestType;

				if ($.i18n.exists(key)) {
					return $.t(key);
				} else {
					return "";
				}
			}
		}

		function getErrorMessage(requestType) {
			var ignore = ["start_forging", "stop_forging", "generate_token", "validate_token"];

			if (ignore.indexOf(requestType) != -1) {
				return "";
			} else {
				var key = "error_" + requestType;

				if ($.i18n.exists(key)) {
					return $.t(key);
				} else {
					return "";
				}
			}
		}

		NRS.processNoteToSelf = async function(data) {
			if (data.add_note_to_self && data.note_to_self) {
				if (data.isVoucher) {
					throw { message: $.t("cannot_add_self_note_to_voucher") };
				}
				if (data.doNotSign) {
					data.messageToEncryptToSelf = data.note_to_self;
				} else if (NRS.isHardwareEncryptionEnabled()) {
					let encrypted = await NRS.encryptUsingHardwareWallet(NRS.publicKey, data.note_to_self);
					data.encryptToSelfMessageData = encrypted.message;
					data.encryptToSelfMessageNonce = encrypted.nonce;
				} else {
					let privateKey;
					if (data.secretPhrase) {
						privateKey = NRS.getPrivateKey(data.secretPhrase);
					}
					let encrypted = await NRS.encryptNote(data.note_to_self, {
						"publicKey": NRS.generatePublicKey(privateKey),
						"privateKey": privateKey
					});
					data.encryptToSelfMessageData = encrypted.message;
					data.encryptToSelfMessageNonce = encrypted.nonce;
				}
				data.messageToEncryptToSelfIsText = "true";
			}
			delete data.note_to_self;
			delete data.add_note_to_self;
		};

		NRS.addMessageData = async function(data, requestType) {
			if (requestType == "sendMessage") {
				data.add_message = true;
			}

			if (!data.add_message && !data.add_note_to_self) {
				delete data.message;
				delete data.note_to_self;
				delete data.encrypt_message;
				delete data.add_message;
				delete data.add_note_to_self;
				return data;
			} else if (!data.add_message) {
				delete data.message;
				delete data.encrypt_message;
				delete data.add_message;
			} else if (!data.add_note_to_self) {
				delete data.note_to_self;
				delete data.add_note_to_self;
			}

			data["_extra"] = {
				"message": data.message,
				"note_to_self": data.note_to_self
			};
			var encrypted;
			var uploadConfig = NRS.getFileUploadConfig("sendMessage", data);
			if ($(uploadConfig.selector)[0].files[0]) {
				data.messageFile = $(uploadConfig.selector)[0].files[0];
			}
			if (data.add_message && (data.message || data.messageFile)) {
				if (data.encrypt_message === undefined) {
					throw new Error($.t('error_no_encryption_option_specified'));
				} else if (data.encrypt_message === "1") {
					try {
						var options = {};
						if (!!data.isVoucher) {
							// A voucher is signed by the recipient private key so encrypted message must be encrypted to the sender public key
							options.account = NRS.accountRS;
						} else if (data.recipient) {
							options.account = data.recipient;
						} else if (data.encryptedMessageRecipient) {
							options.account = data.encryptedMessageRecipient;
							delete data.encryptedMessageRecipient;
						}
						if (data.recipientPublicKey) {
							options.publicKey = data.recipientPublicKey;
						}
						if (data.privateKey) {
							options.privateKey = data.privateKey;
						} else if (data.secretPhrase) {
							options.privateKey = NRS.getPrivateKey(data.secretPhrase);
						}
						if (data.messageFile) {
							if (!NRS.isFileEncryptionSupported()) {
								throw { message: $.t("file_encryption_not_supported")};
							}
							data.messageToEncryptIsText = "false";
							data.encryptedMessageIsPrunable = "true";
							data.encryptionKeys = await NRS.getEncryptionKeys(options);
							let encrypted = await NRS.encryptFile(data.messageFile, data.encryptionKeys);
							data.encryptedMessageData = converters.byteArrayToHexString(encrypted.data);
							data.encryptedMessageNonce = converters.byteArrayToHexString(encrypted.nonce);
							delete data.messageFile;
							delete data.encryptionKeys;
						} else {
							if (data.doNotSign) {
								data.messageToEncrypt = data.message;
							} else if (NRS.isHardwareEncryptionEnabled()) {
								var publicKeyHex;
								if (options.publicKey !== undefined) {
									publicKeyHex = options.publicKey;
								} else if (options.account !== undefined) {
									publicKeyHex = await NRS.getPublicKeyFromAccountId(options.account);
								} else {
									throw {message: "cannot encrypt using hardware wallet without recipient public key"};
								}
								encrypted = await NRS.encryptUsingHardwareWallet(publicKeyHex, data.message);
								data.encryptedMessageData = encrypted.message;
								data.encryptedMessageNonce = encrypted.nonce;
							} else {
								encrypted = await NRS.encryptNote(data.message, options);
								data.encryptedMessageData = encrypted.message;
								data.encryptedMessageNonce = encrypted.nonce;
							}
							data.messageToEncryptIsText = "true";
							if (!data.permanent_message) {
								data.encryptedMessageIsPrunable = "true";
							}
						}
						delete data.message;
					} catch (err) {
						throw err;
					}
				} else if (data.encrypt_message === "0") {
					if (data.messageFile) {
						data.messageIsText = "false";
						data.messageIsPrunable = "true";
					} else {
						data.messageIsText = "true";
						if (!data.permanent_message) {
							data.messageIsPrunable = "true";
						}
					}
				}
			} else {
				delete data.message;
			}
			await NRS.processNoteToSelf(data);
			delete data.add_message;
			return data;
		};

		function warnAndUnlock($modal, $form, $btn, formErrorFunction, msg) {
			NRS.logConsole(msg);
			$form.find(".error_message").html(msg).show();
			if (formErrorFunction) {
				formErrorFunction();
			}
			NRS.unlockForm($modal, $btn);
		}

		NRS.submitForm = async function($modal, $btn) {
			if (!$btn) {
				$btn = $modal.find("button.btn-primary:not([data-dismiss=modal])");
			}

			$modal = $btn.closest(".modal");

			$modal.modal("lock");
			$btn.button("loading");
			$btn.prop('disabled', true);

			var $form;
			if ($btn.data("form")) {
				$form = $modal.find("form#" + $btn.data("form"));
				if (!$form.length) {
					$form = $modal.find("form:first");
				}
			} else {
				$form = $modal.find("form:first");
			}

			var requestType;
			if ($btn.data("request")) {
				requestType = $btn.data("request");
			} else {
				requestType = $form.find("input[name=request_type]").val();
			}
			var requestTypeKey = requestType.replace(/([A-Z])/g, function($1) {
				return "_" + $1.toLowerCase();
			});

			var successMessage = getSuccessMessage(requestTypeKey);
			var errorMessage = getErrorMessage(requestTypeKey);
			var data = null;
			var formErrorFunction = NRS["forms"][requestType + "Error"];
			if (typeof formErrorFunction != "function") {
				formErrorFunction = false;
			}
			var originalRequestType = requestType;
			if (NRS.isRequireBlockchain(requestType)) {
				if (NRS.downloadingBlockchain && NRS.settings.transact_during_download === "0" && !NRS.state.apiProxy) {
					return warnAndUnlock($modal, $form, $btn, formErrorFunction, $.t("error_blockchain_downloading"));
				} else if (NRS.state.isScanning) {
					return warnAndUnlock($modal, $form, $btn, formErrorFunction, $.t("error_form_blockchain_rescanning"));
				}
			}

			var invalidElement = false;

			//TODO
			$form.find(":input").each(function() {
				if ($(this).is(":invalid")) {
					var error = "";
					var name = String($(this).attr("name")).replace("NXT", "").replace("MTA", "").capitalize();
					var value = $(this).val();

					if ($(this).hasAttr("max")) {
						if (!/^[\-\d\.]+$/.test(value)) {
							error = $.t("error_not_a_number", {
								"field": NRS.getTranslatedFieldName(name).toLowerCase()
							}).capitalize();
						} else {
							var max = $(this).attr("max");

							if (value > max) {
								error = $.t("error_max_value", {
									"field": NRS.getTranslatedFieldName(name).toLowerCase(),
									"max": max
								}).capitalize();
							}
						}
					}

					if ($(this).hasAttr("min")) {
						if (!/^[\-\d\.]+$/.test(value)) {
							error = $.t("error_not_a_number", {
								"field": NRS.getTranslatedFieldName(name).toLowerCase()
							}).capitalize();
						} else {
							var min = $(this).attr("min");
							if (value < min) {
								error = $.t("error_min_value", {
									"field": NRS.getTranslatedFieldName(name).toLowerCase(),
									"min": min
								}).capitalize();
							}
						}
					}

					if (!error) {
						error = $.t("error_invalid_field", {
							"field": NRS.getTranslatedFieldName(name).toLowerCase()
						}).capitalize();
					}
					warnAndUnlock($modal, $form, $btn, formErrorFunction, error);
					invalidElement = true;
					return false;
				}
			});

			if (invalidElement) {
				return;
			}

			$form.find(".error_message").html("").hide();
			var formFunction = NRS["forms"][requestType];
			if (typeof formFunction == "function") {
				let output;
				try {
					output = await formFunction($modal, $btn);
				} catch (e) {
					let msg = "function NRS.forms." + requestType + "() threw exception " + e.message + ", please report to developers";
					$.growl(msg);
					NRS.logConsole(e);
					NRS.logException(e);
					NRS.unlockForm($modal, $btn);
					return;
				}
				if (!output) {
					let msg = "Warning: function NRS.forms." + requestType + "() returned no output";
					NRS.logConsole(msg);
					NRS.unlockForm($modal, $btn);
					return;
				} else if (output.error) {
					return warnAndUnlock($modal, $form, $btn, formErrorFunction, output.error.escapeHTML());
				} else {
					if (output.requestType) {
						requestType = output.requestType;
					}
					if (output.data) {
						data = output.data;
					}
					if ("successMessage" in output) {
						successMessage = output.successMessage;
					}
					if ("errorMessage" in output) {
						errorMessage = output.errorMessage;
					}
					if (output.stop) {
						if (errorMessage) {
							$form.find(".error_message").html(errorMessage).show();
						} else if (successMessage) {
							$.growl(successMessage.escapeHTML(), {
								type: "success"
							});
						}
						NRS.unlockForm($modal, $btn, !output.keepOpen);
						return;
					}
					if (output.reload) {
						window.location.reload(output.forceGet);
						return;
					}
				}
			}

			if (!data) {
				data = NRS.getFormData($form);
			}
			// In case the fee field is empty or calculate fee is pressed
			// The feeCalculationEnabled variable distinguishes between the two cases and displays a message to the user
			var feeCalculationEnabled = $modal.find(".btn-calculate-fee").length > 0 && !data.feeNXT && !NRS.isParentChain() && !$btn.hasClass("btn-calculate-fee");
			if ($btn.hasClass("btn-calculate-fee") || feeCalculationEnabled) {
				NRS.logConsole("Calculate fee request feeCalculationEnabled is " + feeCalculationEnabled);
				data.calculateFee = true;
				data.feeMTA = "-1";
				data.feeRateMTAPerFXT = "-1";
				delete data.feeNXT;
				if (feeCalculationEnabled) {
					$form.find(".error_message").html($.t("fee_not_specified")).show();
				}
			} else {
				delete data.calculateFee;
				if (!data.feeNXT && NRS.isParentChain()) {
					data.feeNXT = "0" ;
				}
			}

			if (data.recipient) {
				data.recipient = $.trim(data.recipient);
				if (NRS.isNumericAccount(data.recipient)) {
					return warnAndUnlock($modal, $form, $btn, formErrorFunction, $.t("error_numeric_ids_not_allowed"));
				} else if (!NRS.isRsAccount(data.recipient)) {
					var convertedAccountId = $modal.find("input[name=converted_account_id]").val();
					if (!convertedAccountId || (!NRS.isNumericAccount(convertedAccountId) && !NRS.isRsAccount(convertedAccountId))) {
						return warnAndUnlock($modal, $form, $btn, formErrorFunction, $.t("error_account_id"));
					} else {
						data.recipient = convertedAccountId;
						data["_extra"] = {
							"convertedAccount": true
						};
					}
				}
			}

			if (requestType == "sendMoney" || requestType == "transferAsset" || requestType == "transferCurrency") {
				var merchantInfo = $modal.find("input[name=merchant_info]").val();
				if (merchantInfo) {
					var result = merchantInfo.match(/#merchant:(.*)#/i);

					if (result && result[1]) {
						merchantInfo = $.trim(result[1]);

						if (!data.add_message || !data.message) {
							return warnAndUnlock($modal, $form, $btn, formErrorFunction, $.t("info_merchant_message_required"));
						}

						if (merchantInfo == "numeric") {
							merchantInfo = "[0-9]+";
						} else if (merchantInfo == "alphanumeric") {
							merchantInfo = "[a-zA-Z0-9]+";
						}

						var regexParts = merchantInfo.match(/^\/(.*?)\/(.*)$/);

						if (!regexParts) {
							regexParts = ["", merchantInfo, ""];
						}

						var strippedRegex = regexParts[1].replace(/^[\^\(]*/, "").replace(/[\$\)]*$/, "");

						if (regexParts[1].charAt(0) != "^") {
							regexParts[1] = "^" + regexParts[1];
						}

						if (regexParts[1].slice(-1) != "$") {
							regexParts[1] = regexParts[1] + "$";
						}
						var regexp;
						if (regexParts[2].indexOf("i") !== -1) {
							regexp = new RegExp(regexParts[1], "i");
						} else {
							regexp = new RegExp(regexParts[1]);
						}

						if (!regexp.test(data.message)) {
							var regexType;
							errorMessage = "";
							var lengthRequirement = strippedRegex.match(/\{(.*)\}/);

							if (lengthRequirement) {
								strippedRegex = strippedRegex.replace(lengthRequirement[0], "+");
							}

							if (strippedRegex == "[0-9]+") {
								regexType = "numeric";
							} else if (strippedRegex == "[a-z0-9]+" || strippedRegex.toLowerCase() == "[a-za-z0-9]+" || strippedRegex == "[a-z0-9]+") {
								regexType = "alphanumeric";
							} else {
								regexType = "custom";
							}

							if (lengthRequirement) {
								if (lengthRequirement[1].indexOf(",") != -1) {
									lengthRequirement = lengthRequirement[1].split(",");
									var minLength = parseInt(lengthRequirement[0], 10);
									if (lengthRequirement[1]) {
										var maxLength = parseInt(lengthRequirement[1], 10);
										errorMessage = $.t("error_merchant_message_" + regexType + "_range_length", {
											"minLength": minLength,
											"maxLength": maxLength
										});
									} else {
										errorMessage = $.t("error_merchant_message_" + regexType + "_min_length", {
											"minLength": minLength
										});
									}
								} else {
									var requiredLength = parseInt(lengthRequirement[1], 10);
									errorMessage = $.t("error_merchant_message_" + regexType + "_length", {
										"length": requiredLength
									});
								}
							} else {
								errorMessage = $.t("error_merchant_message_" + regexType);
							}
							return warnAndUnlock($modal, $form, $btn, formErrorFunction, errorMessage);
						}
					}
				}
			}
			if (NRS.displayFormWarning["contract_params_warning"]) {
				var $selector = $form.find(".recipient_contract_reference_selector");
				if ($selector.is(":visible")) {
					var contractName = $selector.find("select").val();
					if (contractName != "") {
						try {
							var params = JSON.parse(data.message);
						} catch (e) {
							return warnAndUnlock($modal, $form, $btn, formErrorFunction, $.t("contract_params_json_format_error", { message: e.message }));
						}
						if (params.contract !== contractName) {
							return warnAndUnlock($modal, $form, $btn, formErrorFunction, $.t("incorrect_contract_name_error", { name: contractName }));
						}
					}
				}
			}
			try {
				data = await NRS.addMessageData(data, requestType);
			} catch (err) {
				return warnAndUnlock($modal, $form, $btn, formErrorFunction, String(err.message).escapeHTML());
			}

			if ("secretPhrase" in data && !data.secretPhrase.length && !NRS.rememberPassword &&
				!(data.calculateFee && NRS.accountInfo.publicKey) && !NRS.isPrivateKeyStoredOnHardware()) {
				$("#" + $modal.attr('id').replace('_modal', '') + "_password").focus();
				return warnAndUnlock($modal, $form, $btn, formErrorFunction, $.t("error_passphrase_required"));
			}

			if (NRS.displayFormWarning["amount_warning"]) {
				if (("amountNXT" in data || "calculatedAmountNXT" in data) && NRS.settings["amount_warning"]) {
					var warningAmountMTA = NRS.settings["amount_warning"][NRS.getActiveChainId() - 1];
					if (warningAmountMTA != "0") {
						try {
							var amountMTA;
							if (data.calculatedAmountNXT) {
								amountMTA = NRS.convertToMTA(data.calculatedAmountNXT);
								delete data.calculatedAmountNXT;
							} else {
								amountMTA = NRS.convertToMTA(data.amountNXT);
							}
						} catch (err) {
							return warnAndUnlock($modal, $form, $btn, formErrorFunction, String(err).escapeHTML() + " (" + $.t("amount") + ")");
						}
						if (new BigInteger(amountMTA).compareTo(new BigInteger(warningAmountMTA)) > 0) {
							NRS.displayFormWarning["amount_warning"] = false;
							warnAndUnlock($modal, $form, $btn, formErrorFunction, $.t("error_max_amount_warning", {
								"nxt": NRS.formatAmount(warningAmountMTA), "coin": NRS.getActiveChainName()
							}));
							return;
						}
					}
				}
			}

			var isParentChainTransaction = (data.isParentChainTransaction == "1");
			var isFeeNxtSpecified = "feeNXT" in data;
			var feeDecimals;
			try {
				if (isFeeNxtSpecified) {
					if (isParentChainTransaction) {
						feeDecimals = NRS.getParentChainDecimals();
					} else {
						feeDecimals = NRS.getActiveChainDecimals();
					}
					data.feeMTA = NRS.floatToInt(data.feeNXT, feeDecimals);
					delete data.feeNXT;
				}
			} catch (err) {
				return warnAndUnlock($modal, $form, $btn, formErrorFunction, String(err).escapeHTML() + " (" + $.t("fee") + ")");
			}

			if (NRS.displayFormWarning["fee_warning"]) {
				if (isFeeNxtSpecified && NRS.settings["fee_warning"]) {
					var feeWarningChainId = isParentChainTransaction ? 1 : NRS.getActiveChainId();
					var warningFeeMTA = NRS.settings["fee_warning"][feeWarningChainId - 1];
					if (warningFeeMTA != "0") {
						if (new BigInteger(data.feeMTA).compareTo(new BigInteger(warningFeeMTA)) > 0) {
							NRS.displayFormWarning["fee_warning"] = false;
							return warnAndUnlock($modal, $form, $btn, formErrorFunction, $.t("error_max_fee_warning", {
								"nxt": NRS.formatAmount(warningFeeMTA, null, null, null, feeDecimals), "coin": NRS.getChainName(feeWarningChainId)
							}));
						}
					}
				}
			}

			if (NRS.displayFormWarning["decimal_positions_warning"]) {
				if ("decimals" in data) {
					try {
						var decimals = parseInt(data.decimals);
					} catch (err) {
						decimals = 0;
					}

					if (decimals < 2) {
						if (requestType == "issueAsset" && data.quantityQNT == "1") {
							// Singleton asset no need to warn
						} else {
							NRS.displayFormWarning["decimal_positions_warning"] = false;
							var entity = (requestType == 'issueCurrency' ? 'currency' : 'asset');
							return warnAndUnlock($modal, $form, $btn, formErrorFunction, $.t("error_decimal_positions_warning", {
								"entity": entity
							}));
						}
					}
				}
			}

			NRS.processApprovalModel(data);

			if (data.doNotBroadcast || data.calculateFee || data.isVoucher) {
				data.broadcast = "false";
				if (data.isVoucher && !data.secretPhrase) {
					// TODO can we sign vouchers using the hardware wallet?
					return warnAndUnlock($modal, $form, $btn, formErrorFunction, $.t("voucher_generator_secret_phrase"));
				}
				if (data.calculateFee) {
					if (NRS.accountInfo.publicKey) {
						data.publicKey = NRS.accountInfo.publicKey;
						delete data.secretPhrase;
					} else if (NRS.isPublicKeyLoadedOnLogin()) {
						data.publicKey = NRS.publicKey;
					}
				}
				if (data.doNotBroadcast) {
					delete data.doNotBroadcast;
				}
			}
			NRS.sendRequest(requestType, data, function (response) {
				formResponse(response, data, requestType, $modal, $form, $btn, successMessage,
					originalRequestType, formErrorFunction, errorMessage);
			});
		};

		function formResponse(response, data, requestType, $modal, $form, $btn, successMessage,
							  originalRequestType, formErrorFunction, errorMessage) {
			//todo check again.. response.error
			var formCompleteFunction;
			var formFeeCalculationFunction = NRS["forms"][originalRequestType + "FeeCalculation"];
			if (response.fullHash) {
				NRS.unlockForm($modal, $btn);
				if (data.calculateFee) {
					updateFee($modal, response.transactionJSON, formFeeCalculationFunction);
					return;
				}

				if (!$modal.hasClass("modal-no-hide")) {
					$modal.modal("hide");
				}

				if (successMessage) {
					$.growl(successMessage.escapeHTML(), {
						type: "success"
					});
				}

				formCompleteFunction = NRS["forms"][originalRequestType + "Complete"];

				if (requestType != "parseTransaction" && requestType != "calculateFullHash") {
					if (typeof formCompleteFunction == "function") {
						data.requestType = requestType;

						if (response.fullHash) {
							NRS.addUnconfirmedTransaction(response.fullHash, function(alreadyProcessed) {
								response.alreadyProcessed = alreadyProcessed;
								formCompleteFunction(response, data);
							});
						} else {
							response.alreadyProcessed = false;
							formCompleteFunction(response, data);
						}
					} else {
						NRS.addUnconfirmedTransaction(response.fullHash);
					}
				} else {
					if (typeof formCompleteFunction == "function") {
						data.requestType = requestType;
						formCompleteFunction(response, data);
					}
				}

			} else if (response.errorCode) {
				return warnAndUnlock($modal, $form, $btn, formErrorFunction, NRS.escapeRespStr(response.errorDescription));
			} else {
				if (data.calculateFee) {
					NRS.unlockForm($modal, $btn, false);
					updateFee($modal, response.transactionJSON, formFeeCalculationFunction);
					return;
				}
				var sentToFunction = false;
				if (!errorMessage) {
					formCompleteFunction = NRS["forms"][originalRequestType + "Complete"];

					if (typeof formCompleteFunction == 'function') {
						sentToFunction = true;
						data.requestType = requestType;

						NRS.unlockForm($modal, $btn);

						if (!$modal.hasClass("modal-no-hide")) {
							$modal.modal("hide");
						}
						formCompleteFunction(response, data);
					} else {
						errorMessage = $.t("error_unknown");
					}
				}
				if (!sentToFunction) {
					NRS.unlockForm($modal, $btn, true);

					$.growl(errorMessage.escapeHTML(), {
						type: 'danger'
					});
				}
			}
		}

		NRS.lockForm = function($modal) {
			$modal.find("button").prop("disabled", true);
			var $btn = $modal.find("button.btn-primary:not([data-dismiss=modal])");
			if ($btn) {
				$btn.button("loading");
			}
			$modal.modal("lock");
			return $btn;
		};


		NRS.unlockForm = function($modal, $btn, hide) {
			if ($btn) {
				setTimeout(function() {
					$btn.prop('disabled', false);
					$btn.button("reset");
				}, 50);
			}
			$modal.modal("unlock");
			if (hide) {
				$modal.modal("hide");
			}
		};

		function updateFee(modal, transaction, formFeeCalculationFunction) {
			var feeMTA = transaction.feeMTA;
			var feeField = $("#" + modal.attr('id').replace('_modal', '') + "_fee");
			if (typeof formFeeCalculationFunction == 'function') {
				formFeeCalculationFunction(feeField, feeMTA, transaction);
			} else {
				feeField.val(NRS.convertToNXT(feeMTA));
			}
			var recalcIndicator = $("#" + modal.attr('id').replace('_modal', '') + "_recalc");
			recalcIndicator.hide();
		}

		return NRS;
	}(NRS || {}, jQuery));
});