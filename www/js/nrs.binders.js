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

        NRS.jsondata = NRS.jsondata||{};

        NRS.jsondata.binders = function (response) {
            var fxtDecimals = NRS.getChain(1).decimals;
            var actionsFormatted = "";
            var rulesFormatted = "";
            var minRateMTAPerFXT;
            if (response.binderRS == NRS.accountRS) {
                var filteredRulesCount = 0;
                var totalRulesCount = 0;
                for (var i in response.bindingRules) {
                    if (response.bindingRules[i].filters) {
                        filteredRulesCount++;
                    }
                    totalRulesCount++;
                }
                rulesFormatted = "<a href='#' data-toggle='modal' data-target='#view_binding_rules_modal' data-rules='" +
                    JSON.stringify(response.bindingRules) + "' data-chain='" + response.chain + "'>" +
                    filteredRulesCount + "/" + totalRulesCount + "</a>";

                actionsFormatted = "<a href='#' class='btn btn-xs' data-toggle='modal' data-target='#stop_binder_modal' " +
                    "data-account='" + NRS.escapeRespStr(response.binderRS) + "' data-chain='" + NRS.escapeRespStr(response.chain) + "'>" + $.t("stop") + "</a>";
                actionsFormatted += "<a href='#' class='btn btn-xs' data-toggle='modal' data-target='#start_binder_modal' data-chain='" +
                    response.chain + "' data-addrule='true'>" + $.t("add_binding_rule") + "</a>";
                if (response.announcedMinRateMTAPerFXT) {
                    minRateMTAPerFXT = NRS.formatQuantity(response.announcedMinRateMTAPerFXT, NRS.getChain(response.chain).decimals);
                } else {
                    minRateMTAPerFXT = "-";
                }

            } else {
                actionsFormatted = "<a href='#' class='btn btn-xs' data-toggle='modal' data-target='#blacklist_binder_modal' " +
                    "data-account='" + NRS.escapeRespStr(response.binderRS) + "'>" + $.t("blacklist") + "</a>";
                minRateMTAPerFXT = NRS.formatQuantity(response.minRateMTAPerFXT, NRS.getChain(response.chain).decimals);
            }
            var currentFeeLimitFQT = "";
            if (response.currentFeeLimitFQT) {
                if (response.currentFeeLimitFQT !== NRS.constants.MAX_LONG_JAVA) {
                    currentFeeLimitFQT = NRS.formatQuantity(response.currentFeeLimitFQT, fxtDecimals);
                }
            } else {
                currentFeeLimitFQT = NRS.formatQuantity(response.totalFeesLimitFQT - response.currentTotalFeesFQT, fxtDecimals)
            }
            return {
                accountFormatted: NRS.getAccountLink(response, "binder"),
                chainFormatted: NRS.getChainLink(response.chain),
                totalFeesLimitFQT: response.totalFeesLimitFQT ? NRS.formatQuantity(response.totalFeesLimitFQT, fxtDecimals) : "",
                currentTotalFeesFQT: response.currentTotalFeesFQT ? NRS.formatQuantity(response.currentTotalFeesFQT, fxtDecimals) : "",
                confirmedTotalFeesFQT: response.confirmedTotalFeesFQT ? NRS.formatQuantity(response.confirmedTotalFeesFQT, fxtDecimals) : "",
                currentFeeLimitFQT: currentFeeLimitFQT,
                minRateMTAPerFXT: minRateMTAPerFXT,
                rulesFormatted: rulesFormatted,
                actionsFormatted: actionsFormatted
            };
        };

        NRS.incoming.binders = function() {
            NRS.loadPage("binders");
        };

        NRS.pages.binders = function() {
            NRS.preparePage();
            NRS.renderBindersTable($("#binders_page_type").find(".active").data("type"));
        };

        NRS.bindingOptions = null;

        function getBindingOptions(callback) {
            if (NRS.bindingOptions == null) {
                NRS.sendRequest("getBindingOptions", {}, function (response) {
                    NRS.bindingOptions = response;
                    callback(NRS.bindingOptions);
                });
            } else {
                callback(NRS.bindingOptions);
            }
        }

        NRS.renderBindersTable = function(type) {
            NRS.hasMorePages = false;
            var view = NRS.simpleview.get('binders_section', {
                errorMessage: null,
                isLoading: true,
                isEmpty: false,
                binders: []
            });
            var params = {
                "adminPassword": NRS.getAdminPassword(),
                "firstIndex": NRS.pageNumber * NRS.itemsPerPage - NRS.itemsPerPage,
                "lastIndex": NRS.pageNumber * NRS.itemsPerPage
            };
            if (NRS.isParentChain()) {
                // For Munhumutapa show binders from all chains and disable the start button
                params["nochain"] = true;
                $("#binders_start_btn").prop("disabled", true);
            } else {
                $("#binders_start_btn").prop("disabled", false);
            }

            params["account"] = NRS.accountRS;
            NRS.sendRequest("getBinders", params, function(getBindersResponse) {
                if (NRS.isErrorResponse(getBindersResponse)) {
                    view.render({
                        errorMessage: NRS.getErrorMessage(getBindersResponse),
                        isLoading: false,
                        isEmpty: false,
                        isParentChain: NRS.isParentChain()
                    });
                    return;
                }
                function addMyBinders() {
                    var response = $.extend({}, getBindersResponse);
                    if (response.binders.length > NRS.itemsPerPage) {
                        NRS.hasMorePages = true;
                        response.binders.pop();
                    }
                    response.binders.forEach(
                        function (binderJson) {
                            view.binders.push(NRS.jsondata.binders(binderJson))
                        }
                    );
                }
                function renderView() {
                    view.render({
                        isLoading: false,
                        isEmpty: view.binders.length == 0,
                        isParentChain: NRS.isParentChain()
                    });
                    NRS.pageLoaded();
                }
                if (type === "my") {
                    view.binders.length = 0;
                    addMyBinders();
                    renderView();
                } else if (type === "all") {
                    NRS.sendRequest("getAllBinderRates", params, function(getAllBinderRatesResponse) {
                        if (NRS.isErrorResponse(getAllBinderRatesResponse)) {
                            view.render({
                                errorMessage: NRS.getErrorMessage(getAllBinderRatesResponse),
                                isLoading: false,
                                isEmpty: false,
                                isParentChain: NRS.isParentChain()
                            });
                            return;
                        }
                        var response = $.extend({}, getAllBinderRatesResponse);
                        response.binders = [];
                        for (var i=0; i < response.rates.length; i++) {
                            var rate = response.rates[i];
                            for (var j=0; j < rate.rates.length; j++) {
                                if (rate.chain != NRS.getActiveChainId() && !NRS.isParentChain()
                                    || rate.rates[j].accountRS == NRS.accountRS) {
                                    continue;
                                }
                                response.binders.push({
                                    "binder": rate.rates[j].account,
                                    "binderRS": rate.rates[j].accountRS,
                                    "chain": rate.chain,
                                    "minRateMTAPerFXT": rate.rates[j].minRateMTAPerFXT,
                                    "currentFeeLimitFQT": rate.rates[j].currentFeeLimitFQT
                                });
                            }
                        }
                        response.binders.sort(function (a, b) {
                            if (a.chain > b.chain) {
                                return 1;
                            } else if (a.chain < b.chain) {
                                return -1;
                            } else {
                                var rate1 = new BigInteger(NRS.floatToInt(a.minRateMTAPerFXT, NRS.getActiveChain().decimals));
                                var rate2 = new BigInteger(NRS.floatToInt(b.minRateMTAPerFXT, NRS.getActiveChain().decimals));
                                return rate1.compareTo(rate2);
                            }
                        });
                        view.binders.length = 0;
                        response.binders.forEach(
                            function (binderJson) {
                                view.binders.push(NRS.jsondata.binders(binderJson))
                            }
                        );
                        addMyBinders();
                        renderView();
                    })
                }
            });
        };

        $("#binders_page_type").find(".btn").click(function (e) {
            e.preventDefault();
            var bindersTable = $("#binders_table");
            bindersTable.find("tbody").empty();
            bindersTable.parent().addClass("data-loading").removeClass("data-empty");
            NRS.renderBindersTable($(this).data("type"));
        });

        NRS.forms.startBinder = function($modal) {
            var isStartBinder = $(".start_binder:first").is(":visible");
            var data = NRS.getFormData($modal.find("form:first"));
            if (data.minRateNXTPerFXT === "") {
                return {
                    "error": $.t("error_binder_rate_required")
                };
            }

            var filtersObj = {"filter": []};
            for (var key in data) {
                if (data.hasOwnProperty(key) && key.indexOf("filterName_") != -1) {
                    var parameterKey = "filterParameter_" + key.substring("filterName_".length);
                    var parameter = data[parameterKey];
                    filtersObj.filter.push(data[key] + (parameter ? (":" + parameter) : ""));
                    delete data[key];
                    delete data[parameterKey];
                }
            }
            $.extend(data, filtersObj);
            delete data.filterName;
            delete data.filterParameter;
            var fxtDecimals = NRS.getChain(1).decimals;
            if (isStartBinder) {
                data.totalFeesLimitFQT = NRS.floatToInt(data.totalFeesLimitFXT, fxtDecimals);
                delete data.chain;
            }
            delete data.totalFeesLimitFXT;
            data.overpayFQTPerFXT = NRS.floatToInt(data.overpayFXTPerFXT, fxtDecimals);
            delete data.overpayFXTPerFXT;
            var result = { data: data };
            if (!isStartBinder) {
                result["requestType"] = "addBindingRule";
            }
            return result;
        };

        NRS.forms.startBinderComplete = function() {
            $.growl($.t("binder_started"));
            NRS.loadPage("binders");
        };

        $("#start_binder_modal").on("show.bs.modal", function(e) {
            var $invoker = $(e.relatedTarget);
            var isAddRule = $invoker.data("addrule");
            $(this).find(".active_binding_filter").remove();
            if (isAddRule) {
                $(this).find(".start_binder").hide();
                var chainId = $invoker.data("chain");
                $(this).find("input[name=chain]").val(chainId);
                $(this).find(".modal-title").text($.t("add_binding_rule"));
            } else {
                $(this).find(".start_binder").show();
                $(this).find(".modal-title").text($.t("start_binder"));
            }
            getBindingOptions(function(options) {
                var feeCalculatorSelect = $("#fee_calculator_id");
                feeCalculatorSelect.empty();
                $.each(options.availableFeeCalculators, function (index, calculatorName) {
                    calculatorName = String(calculatorName).escapeHTML();
                    var selectedAttr = (calculatorName == "MIN_FEE" ? "selected='selected'" : "");
                    feeCalculatorSelect.append("<option value='" + calculatorName + "' " + selectedAttr + ">" +
                        calculatorName + "</option>");
                });
                feeCalculatorSelect.trigger("change");

                var filterNameSelect = $("#filter_name_id");
                filterNameSelect.empty();
                $.each(options.availableFilters, function (index, filter) {
                    filterName = String(filter.name).escapeHTML();
                    filterNameSelect.append("<option value='" + filterName + "'>" + filterName + "</option>");
                });
                filterNameSelect.trigger("change");
            });
        });

        $("#fee_calculator_id").on("change", function () {
            var calculatorName = $(this).val();
            var key = "binder_fee_calculator_help_" + calculatorName.toLowerCase();
            if ($.i18n.exists(key)) {
                $("#fee_calculator_description").show();
                $("#fee_calculator_description").text($.t(key));
            } else {
                $("#fee_calculator_description").hide();
            }
        });

        $("#filter_name_id").on("change", function () {
            var filterName = $(this).val();
            var $helpButton = $(this).parent().parent().find(".binding_filter_details").first();
            if (filterName) {
                var key = "binder_filter_help_" + filterName.toLowerCase();
                var description = "";
                if ($.i18n.exists(key)) {
                    description = $.t(key);
                } else {
                    var filters = NRS.bindingOptions.availableFilters;
                    for (var i = 0; i < filters.length; i++) {
                        if (filters[i].name == "filterName") {
                            description = filters[i].description;
                            break;
                        }
                    }
                }
                $helpButton.attr("data-content", description);
            } else {
                $helpButton.attr("data-content", "");
            }
        });

        $("#add_filter_btn_id").on("click", function() {
            var $form = $(this).closest("form");
            var $original = $form.find(".form_group_multi_filters").first();
            var $clone = $original.clone("true", "true");
            $clone.addClass("active_binding_filter");
            $clone.find("select[name='filterName']").attr("name", "filterName_" + $form.find(".form_group_multi_filters").length);
            $clone.find("input[name='filterParameter']").attr("name", "filterParameter_" + $form.find(".form_group_multi_filters").length);
            $clone.show();

            $form.find(".multi_filters_list_container").append($clone);
            $(function () {
                $form.find("button.binding_filter_details").last().popover({
                    "html": true
                });
            });
        });

        $(".remove_binding_filter_btn").on("click", function(e) {
            e.preventDefault();
            var $form = $(this).closest("form");
            if ($form.find(".form_group_multi_filters").length == 1) {
                return;
            }
            $(this).closest(".form_group_multi_filters").remove();
        });

        $("#stop_binder_modal").on("show.bs.modal", function(e) {
            var $invoker = $(e.relatedTarget);
            var account = $invoker.data("account");
            if (account) {
                $("#stop_binder_account").val(account);
            }
            var chain = $invoker.data("chain");
            if (chain) {
                $("#stop_binder_chain").val(chain);
            }
            if (NRS.getAdminPassword()) {
                $("#stop_binder_admin_password").val(NRS.getAdminPassword());
            }
        });

        NRS.forms.stopBinderComplete = function() {
            $.growl($.t("binder_stopped"));
            NRS.loadPage("binders");
        };

        $("#blacklist_binder_modal").on("show.bs.modal", function(e) {
            var $invoker = $(e.relatedTarget);
            if (!NRS.needsAdminPassword) {
                $("#blacklist_binder_admin_password_wrapper").hide();
            } else {
                if (NRS.getAdminPassword() != "") {
                    $("#blacklist_binder_admin_password").val(NRS.getAdminPassword());
                }
            }
            $("#blacklist_binder_account_id").html($invoker.data("account"));
            $("#blacklist_binder_field_id").val($invoker.data("account"));
        });

        $("#view_binding_rules_modal").on("show.bs.modal", function(e) {
            var $invoker = $(e.relatedTarget);
            var rules = $invoker.data("rules");
            var chain = $invoker.data("chain");
            var fxtDecimals = NRS.getChain(1).decimals;
            //TODO better visualization of the rules
            for (var i in rules) {
                rules[i].minRate = NRS.formatQuantity(rules[i].minRateMTAPerFXT, NRS.getChain(chain).decimals);
                delete rules[i].minRateMTAPerFXT;
                if (rules[i].overpayFQTPerFXT) {
                    rules[i].overpay = NRS.formatQuantity(rules[i].overpayFQTPerFXT, fxtDecimals)
                    delete rules[i].overpayFQTPerFXT;
                }
            }

            $("#view_binding_rules_modal_content").val(JSON.stringify(rules, null, 2));
        });

        NRS.forms.blacklistBinderComplete = function(response) {
            var message;
            var type;
            if (response.errorCode) {
                message = response.errorDescription.escapeHTML();
                type = "danger";
            } else {
                message = $.t("success_blacklist_binder");
                type = "success";
            }
            $.growl(message, {
                "type": type
            });
            NRS.loadPage("binders");
        };

        NRS.forms.bindTransactions = function($modal) {
            var data = NRS.getFormData($modal.find("form:first"));
            data.deadline = String(Math.min(data.betaDeadline - Math.ceil((NRS.toEpochTime() - data.betaTimestamp) / 60), 15));
            delete data.betaDeadline;
            delete data.betaTimestamp;
            return { data: data };
        };

        NRS.forms.bindTransactionsFeeCalculation = function(feeField, feeMTA) {
            feeField.val(NRS.convertToFXT(feeMTA));
        };

        return NRS;

    }(NRS || {}, jQuery));
});