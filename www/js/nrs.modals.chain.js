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
 * @depends {nrs.modals.js}
 */
NRS.onSiteBuildDone().then(() => {
    NRS = (function(NRS, $) {
        $("body").on("click", ".show_chain_modal_action", function(event) {
            event.preventDefault();
            if (NRS.fetchingModalData) {
                return;
            }
            NRS.fetchingModalData = true;
            var chainId;
            if (!$(this).data("chain")) {
                chainId = NRS.getActiveChainId();
            } else if (typeof $(this).data("chain") == "object") {
                var dataObject = $(this).data("chain");
                chainId = dataObject["chain"];
            } else {
                chainId = $(this).data("chain");
            }
            if ($(this).data("back") == "true") {
                NRS.modalStack.pop(); // The forward modal
                NRS.modalStack.pop(); // The current modal
            }
            NRS.showChainDetailsModal(NRS.constants.CHAIN_PROPERTIES[chainId]);
        });

        NRS.showChainDetailsModal = function(chain) {
            try {
                NRS.setBackLink();
                NRS.modalStack.push({ class: "show_chain_modal_action", key: "chain", value: { chain: chain.id }});
                var chainDetails = $.extend({}, chain);
                delete chainDetails.ONE_COIN;
                chainDetails.total_amount_formatted_html = NRS.formatQuantity(chainDetails.totalAmount, chain.decimals);
                delete chainDetails.totalAmount;
                if (chainDetails.SHUFFLING_DEPOSIT_MTA) {
                    chainDetails.shuffling_deposit_formatted_html = NRS.formatQuantity(chainDetails.SHUFFLING_DEPOSIT_MTA, chain.decimals);
                    delete chainDetails.SHUFFLING_DEPOSIT_MTA;
                }
                chainDetails.display_name = NRS.getChainDisplayName(chain.name);
                chainDetails.chain_id = chainDetails.id;
                delete chainDetails.id;
                NRS.sendRequest("getBinderRates", {}, function(response) {
                    chainDetails.binding_rate_formatted_html = "N/A";
                    if (response.rates) {
                        for (var i = 0; i < response.rates.length; i++) {
                            if (response.rates[i].chain == chain.id) {
                                chainDetails.binder_formatted_html = NRS.getAccountLink(response.rates[i], "account");
                                chainDetails.binding_rate_formatted_html = NRS.formatQuantity(response.rates[i].minRateMTAPerFXT, chain.decimals) +
                                    " [" + chain.name + " " + $.t("per") + " " + NRS.getParentChainName() + "]";
                                if (response.rates[i].currentFeeLimitFQT === NRS.constants.MAX_LONG_JAVA) {
                                    chainDetails.fee_limit_formatted_html = $.t("unlimited");
                                } else {
                                    chainDetails.fee_limit_formatted_html = NRS.formatQuantity(response.rates[i].currentFeeLimitFQT, NRS.getChain(1).decimals) +
                                        " [" + NRS.getParentChainName() + "]";
                                }
                                break;
                            }
                        }
                    }
                    var detailsTable = $("#chain_details_table");
                    detailsTable.find("tbody").empty().append(NRS.createInfoTable(chainDetails));
                    detailsTable.show();
                    $("#chain_details_modal").modal("show");
                });
            } finally {
                NRS.fetchingModalData = false;
            }
        };

        return NRS;
    }(NRS || {}, jQuery));
});