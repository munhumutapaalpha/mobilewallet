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

        var $genericSaveModal = $("#m_save_node_process_config_modal");
        var $saveNodeProcessPayload = $("#save_node_process_payload");
        const $forgingSaveModal = $('#m_save_forging_encrypted_modal');
        var accountSecrets = {};
        const forgingAccounts = [];

        var addon_defaults = {
            save_modal            : "#m_save_node_process_config_modal",
            accountExtractor      : genericAccountExtractor,
            payloadCurry          : genericPayloadCurry
        };

        var addons = [
            {
                friendlyName      : "standby_shuffling",
                requestType       : "StandbyShuffling",
                getDataRequestType: "getStandbyShufflers",
                dataParameter     : "standbyShufflers",
                accountParameter  : "account"
            },
            {
                friendlyName      : "binding",
                requestType       : "Binding",
                getDataRequestType: "getBinders",
                dataParameter     : "binders",
                accountParameter  : "binder"
            },
            {
                friendlyName      : "forging",
                requestType       : "Forging",
                dataParameter     : "forging",
                save_modal        : "#m_save_forging_encrypted_modal"
            },
            {
                friendlyName      : "funding_monitors",
                requestType       : "FundingMonitors",
                getDataRequestType: "getFundingMonitor",
                dataParameter     : "monitors",
                accountParameter  : "account"
            },
            {
                friendlyName      : "contract_runner",
                requestType       : "ContractRunner",
                dataParameter     : "contractRunner",
                accountExtractor  : contractRunnerAccountExtractor,
                payloadCurry      : contractRunnerPayloadCurry
            }
        ];

        // apply defaults
        addons = addons.map(function (addon) {
            return $.extend({}, addon_defaults, addon);
        });

        NRS.setup.node_processes_config = function () {
            // check which add-ons are enabled (using constants) to filter view
            addons.forEach(function (addon) {
                addon.showUI = NRS.constants.REQUEST_TYPES['save' + addon.requestType + 'Encrypted'] !== undefined;
            });
            setupCompleteCallbacks();

            // override hidden passphrase input when logged with passphrase remembered
            $genericSaveModal.find(".secret_phrase").show();
            $forgingSaveModal.find(".secret_phrase").show();

            if (!NRS.isFileReaderSupported()) {
                $uploadFileBtn.hide();
            }
        };

        NRS.pages.node_processes_config = function() {
            NRS.preparePage();
            NRS.simpleview.get('node_processes_config_page', {
                addons: addons,
                emptyUI: addons.every(function (addon) { return !addon.showUI; })
            });
        };

        /************************************** Save modal  **************************************/

        /**
         * Upon showing the modal we try to populate the data textarea with the current configuration.
         */
        $genericSaveModal.on("show.bs.modal", function(event) {
            var $invoker = $(event.relatedTarget);
            var addon = addons[$invoker.data("addon")];
            $genericSaveModal.data("addon", addon);
            $genericSaveModal.find(".modal-title").text($.t("save") + ": " + $.t(addon.friendlyName));
            $genericSaveModal.find(".callout-info").hide();
            accountSecrets = {};
            $("#save_node_process_config_request_type").val("save" + addon.requestType + "Encrypted");
            if (addon.getDataRequestType !== undefined) {
                NRS.sendRequest(addon.getDataRequestType, {"adminPassword": NRS.getAdminPassword(), "nochain": true},
                    function (response) {
                        if (NRS.isErrorResponse(response)) {
                            const msg = $.t("cannot_load_current") + " " + addon.getDataRequestType + ": " + NRS.unescapeRespStr(NRS.getErrorMessage(response));
                            $genericSaveModal.find(".error_message").text(msg).show();
                            $genericSaveModal.find(".passphrasesPanel,.encryptionPanel").addClass("hidden");
                            $genericSaveModal.find(".modal-footer button.btn-primary").prop("disabled", true);
                            return;
                        }
                        delete response.requestProcessingTime;
                        $saveNodeProcessPayload.val(JSON.stringify(response, null, 2)).change();
                    });
            } else if (addon.requestType === 'ContractRunner') {
                $genericSaveModal.find(".callout-info").text($.t("contract_runner_save_config_tip")).show();
                var template = {
                    "accountRS": NRS.accountRS,
                    "autoFeeRate": true,
                    "validator": false,
                    "params": {}
                };
                $saveNodeProcessPayload.val(JSON.stringify(template, null, 2)).change();
            }
        }).on("hidden.bs.modal", function() {
            accountSecrets = {}; // we don't want passphrases in memory for longer than strictly needed
        });

        const $uploadFileBtn = $('#upload_file_save_processes_btn');
        $uploadFileBtn.on('click', () => $('#upload_file_save_processes_field').click());

        $genericSaveModal.on('change', '#upload_file_save_processes_field', function (ev) {
            ev.preventDefault();
            const button = $(this);
            const reader = new FileReader();
            reader.onload = () => $saveNodeProcessPayload.val(reader.result).change();
            reader.readAsText(button[0].files[0]);
            button.replaceWith(button.clone()); // Recreate button to clean it
        });

        /**
         * On each change of the data textarea we update the set and state of account passphrases remaining.
         */
        $saveNodeProcessPayload.on('change', function () {
            var addon = $genericSaveModal.data("addon");

            // remove pending accounts (we want to keep already entered secrets)
            Object.getOwnPropertyNames(accountSecrets).forEach(function (account) {
                if (accountSecrets[account] === null) {
                    delete accountSecrets[account];
                }
            });

            try {
                $genericSaveModal.find(".error_message").hide();
                var payloadAccounts = addon.accountExtractor(addon);
            } catch (e) {
                var msg = $.t("cannot_parse_json") + ": " + (e.message || e);
                $genericSaveModal.find(".error_message").text(msg).show();
                return;
            }
            payloadAccounts.forEach(function (account) {
                if (!accountSecrets.hasOwnProperty(account)) {
                    accountSecrets[account] = null;
                }
            });
            updatePassphrasesStatus();
        });

        function genericAccountExtractor(addon) {
            var payload = JSON.parse($saveNodeProcessPayload.val());
            var dataArray = payload[addon.dataParameter];
            if (dataArray === undefined) {
                throw $.t('error_invalid_field', {field: addon.dataParameter});
            }
            return dataArray.map(function (o) {
                return o[addon.accountParameter];
            });
        }

        function contractRunnerAccountExtractor() {
            var payload = JSON.parse($saveNodeProcessPayload.val());
            if (NRS.isRsAccount(payload.accountRS)) {
                var address = NRS.createRsAddress();
                address.set(payload.accountRS);
                return [address.account_id()];
            } else {
                return [];
            }
        }

        /**
         * This method controls the remaining passphrases required to the user and paints the list if necessary.
         * Otherwise it shows the encryption password inputs.
         *
         * @returns {boolean} do we have all required passphrases?
         */
        function updatePassphrasesStatus() {
            // retrieve list of remaining passphrases required
            var pendingAccounts = Object.getOwnPropertyNames(accountSecrets).filter(function (account) {
                return accountSecrets[account] === null;
            }).map(function (account) {
                return NRS.convertNumericToRSAccountFormat(account);
            });

            if (pendingAccounts.length === 0) {
                // if empty, then hide passphrases panel, show encryption passphrase panel and enable "Save" button
                $genericSaveModal.find(".passphrasesPanel").addClass("hidden");
                $genericSaveModal.find(".encryptionPanel").removeClass("hidden");
                $genericSaveModal.find(".modal-footer button.btn-primary").prop("disabled", false);
                return true;
            } else {
                // if not empty, then show passphrases panel, update content list, hide encryption passphrase panel and disable "Save" button
                $genericSaveModal.find(".passphrasesPanel").removeClass("hidden").find("ul").empty().append(
                    pendingAccounts.map(function (accountRS) {
                        return $('<li>').text(accountRS);
                    })
                );
                $genericSaveModal.find(".encryptionPanel").addClass("hidden");
                $genericSaveModal.find(".modal-footer button.btn-primary").prop("disabled", true);
                return false;
            }
        }

        /**
         * Add passphrase button controller.
         */
        $genericSaveModal.find(".passphrasesPanel button.btn-primary").on("click", function () {
            var $passphraseInput = $("#m_save_node_process_config_password");
            var passphrase = $passphraseInput.val();
            if (passphrase === "") {
                $.growl($.t("empty_passphrase"), {type:'warning'});
            } else {
                $passphraseInput.val('');
                $("#m_save_node_process_config_is_shared_secret").prop("checked", false).change();
                let privateKey = NRS.getPrivateKey(passphrase);
                var account = NRS.getAccountId(privateKey, false);
                if (accountSecrets[account] !== null) {
                    $.growl($.t("passphrase_not_one_of_remaining"), {type:'warning'});
                }
                accountSecrets[account] = privateKey;
                updatePassphrasesStatus();
            }
        });

        /////////// Forging save modal

        $forgingSaveModal.on('show.bs.modal', function () {
            forgingAccounts.length = 0;
            renderForgingAccountsTable();
        }).on("hidden.bs.modal", function() {
            forgingAccounts.length = 0; // we don't want passphrases in memory for longer than strictly needed
        });

        $forgingSaveModal.find('.addForgerButton').on('click', function () {
            const $passphraseInput = $('#m_save_forging_encrypted_password');
            const passphrase = $passphraseInput.val();
            if (passphrase === "") {
                $.growl($.t("empty_passphrase"), {type:'warning'});
            } else {
                $passphraseInput.val('');
                $("#m_save_forging_encrypted_is_shared_secret").prop("checked", false).change();
                let privateKey = NRS.getPrivateKey(passphrase);
                const accountId = NRS.getAccountId(privateKey, false);
                const forgingAccount = {
                    account: accountId,
                    accountRS: NRS.convertNumericToRSAccountFormat(accountId),
                    privateKey: privateKey,
                    effectiveBalance: null
                };
                forgingAccounts.push(forgingAccount);
                renderForgingAccountsTable();
                NRS.sendRequest('getEffectiveBalance', {account: accountId}, function (response) {
                    if (response.effectiveBalanceFXT !== undefined) {
                        forgingAccount.effectiveBalance = response.effectiveBalanceFXT;
                        renderForgingAccountsTable();
                    }
                });
            }
        });

        $forgingSaveModal.on('click', 'span.forgetForgingAccount', function () {
            forgingAccounts.splice($(this).data('index'), 1);
            renderForgingAccountsTable();
        });

        function renderForgingAccountsTable() {
            const $forgingAccountsList = $forgingSaveModal.find('dl.forgingAccounts');
            const html = forgingAccounts.map((account,index) => {
                return `<dt>${account.accountRS}<span class='forgetForgingAccount' data-index='${index}'>x</span></dt>
                    <dd>Effective balance: ${account.effectiveBalance === null ? '...' : account.effectiveBalance}</dd>`;
            });
            $forgingAccountsList.html(html);
        }

        /************************************** Save operation  **************************************/

        function genericSaveEncrypted ($modal) {
            var data = NRS.getFormData($modal.find("form:first"));
            var addon = $modal.data("addon");

            if (!data.encryptionPassword || data.encryptionPassword.length < 10) {
                return {
                    "error": $.t("configuration_password_short")
                };
            }

            if (data.encryptionPassword !== data.encryptionPassword2) {
                return {
                    "error": $.t("configuration_password_match")
                };
            }
            delete data.encryptionPassword2;

            if (!updatePassphrasesStatus()) {
                return;
            }

            // add the corresponding secretphrase to each object in the payload array
            try {
                data.payload = JSON.parse(data.payload);
            } catch(e) {
                return {
                    "error": $.t("cannot_parse_json") + ": " + (e.message || e)
                };
            }

            var secretPhraseAsEncryptionPassword = addon.payloadCurry(addon, data);
            delete data.secretPhrase;

            // warn if using one of the secret phrases as encryption passphrase
            if (secretPhraseAsEncryptionPassword) {
                return {
                    "error": $.t("encryption_passphrase_is_secretphrase")
                };
            }

            // client-side encryption
            var encryptedPayload = NRS.aesEncrypt(JSON.stringify(data.payload), { sharedKey: converters.stringToByteArray(data.encryptionPassword) });
            delete data.payload;
            delete data.encryptionPassword;
            data[addon.dataParameter] = converters.byteArrayToHexString(encryptedPayload);
            data.dataAlreadyEncrypted = true;

            data.adminPassword = NRS.getAdminPassword();

            return {
                "data": data
            };
        }

        function genericPayloadCurry(addon, data) {
            if (Array.isArray(data.payload[addon.dataParameter])) {
                var dataArray = data.payload[addon.dataParameter];
                dataArray.forEach(function (element) {
                    var account = element[addon.accountParameter];
                    if (accountSecrets[account] === data.encryptionPassword) {
                        return true;
                    }
                    element.privateKey = accountSecrets[account];
                });
            }
            return false;
        }

        function contractRunnerPayloadCurry(addon, data) {
            var address = NRS.createRsAddress();
            address.set(data.payload.accountRS);
            var account = address.account_id();
            data.payload.privateKey = accountSecrets[account];
            return accountSecrets[account] === data.encryptionPassword;
        }

        NRS.forms.saveStandbyShufflingEncrypted = genericSaveEncrypted;
        NRS.forms.saveBindingEncrypted = genericSaveEncrypted;
        NRS.forms.saveFundingMonitorsEncrypted = genericSaveEncrypted;
        NRS.forms.saveContractRunnerEncrypted = genericSaveEncrypted;

        NRS.forms.saveForgingEncrypted = function ($modal) {
            var data = NRS.getFormData($modal.find("form:first"));
            delete data.secretPhrase;

            if (forgingAccounts.length === 0 && $('#m_save_forging_encrypted_password').val() !== "") {
                return {
                    "error": $.t("save_forging_empty_list_filled_input")
                };
            }

            if (!data.encryptionPassword || data.encryptionPassword.length < 10) {
                return {
                    "error": $.t("configuration_password_short")
                };
            }

            if (data.encryptionPassword !== data.encryptionPassword2) {
                return {
                    "error": $.t("configuration_password_match")
                };
            }
            delete data.encryptionPassword2;

            data.payload = forgingAccounts.map(account => account.privateKey).join('\n');

            // warn if using one of the secret phrases as encryption passphrase
            if (data.payload.includes(data.encryptionPassword)) {
                return {
                    "error": $.t("encryption_passphrase_is_secretphrase")
                };
            }

            // client-side encryption
            var encryptedPayload = NRS.aesEncrypt(data.payload, { sharedKey: converters.stringToByteArray(data.encryptionPassword) });
            delete data.payload;
            delete data.encryptionPassword;
            data.passphrases = converters.byteArrayToHexString(encryptedPayload);
            data.dataAlreadyEncrypted = true;

            data.adminPassword = NRS.getAdminPassword();

            return {
                "data": data
            };
        };

        /************************************** Start modal  **************************************/

        $("#m_start_node_process_config_modal").on("show.bs.modal", function(event) {
            var $invoker = $(event.relatedTarget);
            var addon = addons[$invoker.data("addon")];
            var $modal = $(this);
            $modal.find(".modal-title").text($.t("start") + ": " + $.t(addon.friendlyName));
            $("#start_node_process_config_request_type").val("start" + addon.requestType + "Encrypted");
        });

        /************************************** Start operation  **************************************/

        function genericStartEncrypted ($modal) {
            var data = NRS.getFormData($modal.find("form:first"));

            data.adminPassword = NRS.getAdminPassword();

            return {
                "data": data
            };
        }

        NRS.forms.startStandbyShufflingEncrypted = genericStartEncrypted;
        NRS.forms.startBindingEncrypted = genericStartEncrypted;
        NRS.forms.startForgingEncrypted = genericStartEncrypted;
        NRS.forms.startFundingMonitorsEncrypted = genericStartEncrypted;
        NRS.forms.startContractRunnerEncrypted = genericStartEncrypted;

        /************************************** Complete callbacks **************************************/

        function genericSaveEncryptedComplete(processName) {
            return function() {
                $.growl($.t("process_file_saved", {process: processName}));
            };
        }

        function setupCompleteCallbacks() {
            NRS.forms.saveStandbyShufflingEncryptedComplete = genericSaveEncryptedComplete($.t("standby_shuffling"));
            NRS.forms.saveBindingEncryptedComplete = genericSaveEncryptedComplete($.t("binders"));
            NRS.forms.saveForgingEncryptedComplete = genericSaveEncryptedComplete($.t("forging"));
            NRS.forms.saveFundingMonitorsEncryptedComplete = genericSaveEncryptedComplete($.t("funding_monitors"));
            NRS.forms.saveContractRunnerEncryptedComplete = genericSaveEncryptedComplete($.t("contract_runner"));
        }

        NRS.forms.startStandbyShufflingEncryptedComplete = function (response) {
            if (Array.isArray(response.standbyShufflers)) {
                $.growl($.t("loaded_started_standbyshufflers", {
                    loaded : response.standbyShufflers.length,
                    started: response.standbyShufflers.filter(function (standbyShuffler) { return standbyShuffler.started; }).length
                }));
            }
        };

        NRS.forms.startBindingEncryptedComplete = function (response) {
            if (Array.isArray(response.binders)) {
                $.growl($.t("started_binders", {count: response.binders.length}));
            }
        };

        NRS.forms.startForgingEncryptedComplete = function (response) {
            $.growl($.t("forgers_started", {count: response.forgersStarted, balance: response.totalEffectiveBalance}));
        };

        NRS.forms.startFundingMonitorsEncryptedComplete = function (response) {
            if (Array.isArray(response.monitors)) {
                $.growl($.t("started_monitors", {count: response.monitors.length}));
            }
        };

        NRS.forms.startContractRunnerEncryptedComplete = function (response) {
            if (response.configLoaded) {
                $.growl($.t("contract_runner_configuration_loaded"));
            } else {
                $.growl($.t("contract_runner_configuration_load_error"), {type: "danger"});
            }
        };

        return NRS;
    }(NRS || {}, jQuery));
});