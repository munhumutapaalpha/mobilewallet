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

(isNode ? client : NRS).onSiteBuildDone().then(() => {
    NRS = (function (NRS, $, undefined) {
        NRS.formatVolume = function (volume) {
            var sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            if (volume == 0) return '0 B';
            var i = parseInt(Math.floor(Math.log(volume) / Math.log(1024)));

            volume = Math.round(volume / Math.pow(1024, i));
            var size = sizes[i];

            var digits = [], formattedVolume = "";
            do {
                digits[digits.length] = volume % 10;
                volume = Math.floor(volume / 10);
            } while (volume > 0);
            for (i = 0; i < digits.length; i++) {
                if (i > 0 && i % 3 == 0) {
                    formattedVolume = "'" + formattedVolume;
                }
                formattedVolume = digits[i] + formattedVolume;
            }
            return formattedVolume + " " + size;
        };

        NRS.formatWeight = function (weight) {
            var digits = [],
                formattedWeight = "",
                i;
            do {
                digits[digits.length] = weight % 10;
                weight = Math.floor(weight / 10);
            } while (weight > 0);
            for (i = 0; i < digits.length; i++) {
                if (i > 0 && i % 3 == 0) {
                    formattedWeight = "'" + formattedWeight;
                }
                formattedWeight = digits[i] + formattedWeight;
            }
            return formattedWeight.escapeHTML();
        };

        NRS.fromEpochTime = function (epochTime) {
            if (!NRS.constants || NRS.constants.EPOCH_BEGINNING == 0) {
                throw "undefined epoch beginning";
            }
            return epochTime * 1000 + NRS.constants.EPOCH_BEGINNING - 500;
        };

        NRS.toEpochTime = function (currentTime) {
            if (currentTime == undefined) {
                currentTime = new Date();
            }
            if (NRS.constants.EPOCH_BEGINNING == 0) {
                throw "undefined epoch beginning";
            }
            return Math.floor((currentTime - NRS.constants.EPOCH_BEGINNING) / 1000);
        };

        NRS.formatTimestamp = function (timestamp, date_only, isAbsoluteTime) {
            var locale = NRS.getLocale();
            var date;
            if (typeof timestamp == "object") {
                date = timestamp;
            } else if (isAbsoluteTime) {
                date = new Date(timestamp);
            } else {
                date = new Date(NRS.fromEpochTime(timestamp));
            }

            if (!isNaN(date) && typeof (date.getFullYear) == 'function') {
                var d = date.getDate();
                var dd = d < 10 ? '0' + d : d;
                var M = date.getMonth() + 1;
                var MM = M < 10 ? '0' + M : M;
                var yyyy = date.getFullYear();
                var yy = String(yyyy).substring(2);

                var res = locale.dateFormat
                    .replace(/dd/g, dd)
                    .replace(/d/g, d)
                    .replace(/MM/g, MM)
                    .replace(/M/g, M)
                    .replace(/yyyy/g, yyyy)
                    .replace(/yy/g, yy);

                if (!date_only) {
                    var hours = date.getHours();
                    var originalHours = hours;
                    var minutes = date.getMinutes();
                    var seconds = date.getSeconds();

                    if (!NRS.settings || NRS.settings["24_hour_format"] == "0") {
                        if (originalHours == 0) {
                            hours += 12;
                        } else if (originalHours >= 13 && originalHours <= 23) {
                            hours -= 12;
                        }
                    }
                    if (minutes < 10) {
                        minutes = "0" + minutes;
                    }
                    if (seconds < 10) {
                        seconds = "0" + seconds;
                    }
                    res += " " + hours + ":" + minutes + ":" + seconds;

                    if (!NRS.settings || NRS.settings["24_hour_format"] == "0") {
                        res += " " + (originalHours >= 12 ? "PM" : "AM");
                    }
                }
                return res;
            } else {
                return date.toLocaleString();
            }
        };

        NRS.isEmptyObject = function (obj) {
            let name;
            for (name in obj) {
                return false;
            }
            return true;
        };

        // TODO test
        NRS.hasAccountControl = function () {
            return NRS.accountInfo.accountControls && NRS.accountInfo.accountControls.indexOf('PHASING_ONLY') > -1
                && NRS.accountInfo.phasingOnly
                && NRS.accountInfo.phasingOnly.controlParams.phasingVotingModel >= 0;
        };

        NRS.getRequestPath = function (noProxy) {
            let url = NRS.getRemoteNodeUrl();
            if (!NRS.state || !NRS.state.apiProxy || noProxy) {
                return url + "/nxt";
            } else {
                return url + "/nxt-proxy";
            }
        };

        NRS.getBlockHeightMoment = function (height) {
            if (!height || !NRS.lastBlockHeight || !NRS.averageBlockGenerationTime) {
                return "-";
            }
            var heightDiff = height - NRS.lastBlockHeight;
            return moment().add(heightDiff * NRS.averageBlockGenerationTime, 'seconds');
        };

        NRS.getBlockHeightTimeEstimate = function (height) {
            var heightMoment = NRS.getBlockHeightMoment(height);
            if (heightMoment == "-") {
                return "-";
            }
            return heightMoment.format("YYYY/MM/DD hh:mm a");
        };

        NRS.baseTargetPercent = function (block) {
            if (block) {
                var percent = Math.round(block.baseTarget / NRS.constants.INITIAL_BASE_TARGET * 100);
                if (NRS.isTestNet && block.height > NRS.constants.TESTNET_ACCELERATION_BLOCK) {
                    return Math.round(percent / NRS.constants.TESTNET_ACCELERATION); // Reflect change of block time to 6 seconds on testnet
                } else {
                    return percent;
                }
            } else {
                return 0;
            }
        };

        NRS.convertToHex16 = function (str) {
            var hex, i;
            var result = "";
            for (i = 0; i < str.length; i++) {
                hex = str.charCodeAt(i).toString(16);
                result += ("000" + hex).slice(-4);
            }

            return result;
        };

        NRS.convertFromHex16 = function (hex) {
            var j;
            var hexes = hex.match(/.{1,4}/g) || [];
            var back = "";
            for (j = 0; j < hexes.length; j++) {
                back += String.fromCharCode(parseInt(hexes[j], 16));
            }

            return back;
        };

        NRS.convertFromHex8 = function (hex) {
            var hexStr = hex.toString(); //force conversion
            var str = '';
            for (var i = 0; i < hexStr.length; i += 2) {
                str += String.fromCharCode(parseInt(hexStr.substr(i, 2), 16));
            }
            return str;
        };

        NRS.convertToHex8 = function (str) {
            var hex = '';
            for (var i = 0; i < str.length; i++) {
                hex += '' + str.charCodeAt(i).toString(16);
            }
            return hex;
        };

        NRS.getFormData = function ($form, unmodified) {
            var serialized = $form.serializeArray(); // Warning: converts \n to \r\n
            var data = {};
            var multiValuedFields = ["phasingWhitelisted", "controlWhitelisted"];
            for (var s in serialized) {
                if (!serialized.hasOwnProperty(s)) {
                    continue;
                }
                if (multiValuedFields.indexOf(serialized[s]["name"]) > -1) {
                    if (serialized[s]['value'] != "") {
                        if (serialized[s]['name'] in data) {
                            var index = data[serialized[s]['name']].length;
                            data[serialized[s]['name']][index] = serialized[s]['value'];
                        } else {
                            data[serialized[s]['name']] = [serialized[s]['value']]; //all data as list (traditional, to allow multiple values)
                        }
                    }
                } else {
                    data[serialized[s]['name']] = serialized[s]['value'];
                }
            }
            if (!unmodified) {
                delete data.request_type;
                delete data.converted_account_id;
                delete data.merchant_info;
            }
            return data;
        };

        NRS.mergeMaps = function (mergedMap, toMap, skipAttributes) {
            for (var attr in mergedMap) {
                if (!mergedMap.hasOwnProperty(attr)) {
                    continue;
                }
                if (skipAttributes[attr]) {
                    continue;
                }
                toMap[attr] = mergedMap[attr];
            }
        };

        NRS.fullHashToId = function (fullHash) {
            var transactionBytes = converters.hexStringToByteArray(fullHash);
            return converters.byteArrayToBigInteger(transactionBytes, 0).toString().escapeHTML();
        };

        NRS.appendSmallScreenSidebarReplacementSelect = (page, getOptionLabel = (sitebarItem) => $(sitebarItem).text()) => {
            page.find(".content-header .header-select-container").remove();
            page.find(".content-header")
                .append(`<div style="display:none;" class="mobile-view header-select-container">
                <select>
                </select>
            </div>`);
            const selectControl = page.find(".content-header .header-select-container select");
            const sidebarItems = page.find(".content-splitter-sidebar .list-group-item");
            let attributeName;
            let selectedValue;
            sidebarItems.each((index, sidebarItem) => {
                if (attributeName === undefined) {
                    const sidebarItemAttributes = sidebarItem.attributes;
                    let attribute = Array.prototype.find.call(sidebarItemAttributes, function (attr) {
                        return attr.name.indexOf('data') > -1 &&
                            attr.name !== "data-cache" &&
                            attr.name !== "data-closed";
                    });
                    attributeName = attribute.name;
                }
                const attributeValue = sidebarItem.getAttribute(attributeName);
                if ($(sidebarItem).hasClass('active')) {
                    selectedValue = attributeValue;
                }
                const option = $(`<option value='${attributeValue}'>
                ${getOptionLabel(sidebarItem)}
            </option>`);
                selectControl.append(option);
                $(sidebarItem).on("click", (event) => {
                    selectControl.val(attributeValue);
                });
            });
            selectControl.on("change", (event) => {
                const attributeValue = selectControl.val();
                sidebarItems.filter(`[${attributeName}=${attributeValue}]`).click();
            });
            selectControl.val(selectedValue);
        };

        NRS.readFileAsync = function (file) {
            return new Promise((resolve, reject) => {
                let reader = new FileReader();
                reader.onload = () => {
                    resolve(reader.result);
                };
                reader.onerror = reject;
                reader.readAsArrayBuffer(file);
            })
        };

        NRS.getAccountLink = function (object, accountKey, accountRef, title, showAccountRS, clazz, onClickAction) {
            var accountRS;
            if (typeof object[accountKey + "RS"] != "undefined") {
                accountRS = object[accountKey + "RS"];
            } else if (typeof object[accountKey] != "undefined") {
                accountRS = NRS.convertNumericToRSAccountFormat(object[accountKey]);
            } else {
                return '/';
            }
            var accountTitle;
            if (accountRef && (accountRS === accountRef || NRS.isSameAccountAddress(accountRS, accountRef))) {
                accountTitle = $.t(title);
            } else if (showAccountRS) {
                accountTitle = String(accountRS).escapeHTML();
            } else {
                accountTitle = NRS.getAccountTitle(object, accountKey);
            }

            let shortVersion = accountTitle.length > 5 ? "..." + String(accountTitle.substr(accountTitle.length - 5)) : accountTitle;

            if (!clazz) {
                clazz = "";
            } else {
                if (clazz.length > 0) {
                    if (String(clazz).indexOf(" ") != 0) {
                        clazz = " " + clazz;
                    }
                }
            }
            var onClickHandler = onClickAction ? "onclick='" + onClickAction + "' " : "";
            return `<a href='#'
                    ${onClickHandler} 
                    data-user='${String(accountRS).escapeHTML()}'
                    class='show_account_modal_action user-info${clazz}'>
                        <span class='regular-view'>${accountTitle}</span>
                        <span class='mobile-view' style='display: none' title='${accountTitle}'>${shortVersion}</span>
                </a>`;
        };

        NRS.formatFullHash = function (fullHash) {
            return NRS.escapeRespStr(fullHash).substring(8); // Present the first 8 letters like GIT
        };

        NRS.getTransactionLink = function (id, text, isEscapedText, chain, fxtTransaction) {
            if (!text) {
                if (!id) {
                    text = fxtTransaction;
                } else {
                    text = NRS.fullHashToId(id);
                }
            }
            if (!chain) {
                chain = NRS.getActiveChainId();
            }
            if (!fxtTransaction) {
                fxtTransaction = "";
            }
            if (!id) {
                id = "";
            }
            return "<a href='#' class='show_transaction_modal_action' data-fullHash='" + id + "' data-chain='" + String(chain).escapeHTML() + "' data-fxttransaction='" + fxtTransaction + "'>"
                + (isEscapedText ? text : String(text).escapeHTML()) + "</a>";
        };

        NRS.getChainLink = function (chain) {
            return "<a href='#' class='show_chain_modal_action' data-chain='" + String(chain).escapeHTML() + "'>"
                + NRS.getChainName(chain) + "</a>";
        };

        NRS.getHoldingLink = function (holding, holdingType, text) {
            var request;
            var key;
            if (holdingType == 1) {
                request = "getAsset";
                key = "asset";
            } else {
                request = "getCurrency";
                key = "currency";
            }
            if (!text) {
                text = holding;
            }
            return NRS.getEntityLink({request: request, id: holding, key: key, text: text})
        };

        NRS.getVotingModelHoldingLink = function (holding, votingModel, text) {
            var request;
            var key;
            if (votingModel == 2) {
                request = "getAsset";
                key = "asset";
            } else if (votingModel == 3) {
                request = "getCurrency";
                key = "currency";
            } else {
                return "";
            }
            if (!text) {
                text = holding;
            }
            return NRS.getEntityLink({request: request, id: holding, key: key, text: text})
        };

        NRS.getLedgerHoldingLink = function (holding, ledgerHoldingType, text) {
            var request;
            var key;
            if (ledgerHoldingType == 3 || ledgerHoldingType == 4) {
                request = "getAsset";
                key = "asset";
            } else {
                request = "getCurrency";
                key = "currency";
            }
            if (!text) {
                text = holding;
            }
            return NRS.getEntityLink({request: request, id: holding, key: key, text: text})
        };

        NRS.getEntityLink = function (options) {
            if (!options.text) {
                options.text = options.id;
            }
            if (!options.chain) {
                options.chain = NRS.getActiveChainId();
            }
            return "<a href='#' class='show_entity_modal_action' " +
                "data-chain='" + options.chain + "' " +
                "data-id='" + options.id + "' " +
                "data-id2='" + options.id2 + "' " +
                "data-request='" + options.request + "' " +
                "data-key='" + options.key + "' " +
                "data-key2='" + options.key2 + "' " +
                "data-response-array='" + options.responseArray + "'>" + String(options.text).escapeHTML() + "</a>";
        };

        NRS.getBlockLink = function (height, text, isEscapedText) {
            if (!text) {
                text = height;
            }
            return "<a href='#' class='show_block_modal_action' data-block='" + String(height).escapeHTML() + "'>"
                + (isEscapedText ? text : String(text).escapeHTML()) + "</a>";
        };

        NRS.getPeerLink = function (address) {
            if (!address) {
                return "(" + $.t("temporarily_disconnected") + ")";
            }
            return "<a href='#' class='show_peer_modal_action' data-address='" + String(address).escapeHTML() + "'>"
                + String(address).escapeHTML() + "</a>";
        };

        NRS.setBackLink = function () {
            var backLink = $(".back-link");
            if (NRS.modalStack.length > 0) {
                var backModalInfo = NRS.modalStack[NRS.modalStack.length - 1];
                backLink.removeClass("show_transaction_modal_action show_account_modal_action show_block_modal_action show_ledger_modal_action dgs_show_modal_action_purchase dgs_show_modal_action_product");
                backLink.addClass(backModalInfo.class);
                backLink.data(backModalInfo.key, backModalInfo.value);
                backLink.data("back", "true");
                backLink.show();
            } else {
                backLink.hide();
            }
        };

        NRS.getAccountTitle = function (object, acc) {
            var type = typeof object;

            var formattedAcc = "";

            if (type == "string" || type == "number") {
                formattedAcc = object;
                object = null;
            } else {
                if (object == null || typeof object[acc + "RS"] == "undefined") {
                    return "/";
                } else {
                    formattedAcc = String(object[acc + "RS"]).escapeHTML();
                }
            }

            if (formattedAcc === NRS.account || formattedAcc === NRS.accountRS || NRS.isSameAccountAddress(formattedAcc, NRS.accountRS)) {
                return $.t("you");
            } else if (formattedAcc in NRS.contacts) {
                return NRS.contacts[formattedAcc].name.escapeHTML();
            } else {
                return String(formattedAcc).escapeHTML();
            }
        };

        NRS.getAccountFormatted = function (object, acc) {
            var type = typeof object;

            if (type == "string" || type == "number") {
                return String(object).escapeHTML();
            } else {
                if (typeof object[acc + "RS"] == "undefined") {
                    return "";
                } else {
                    return String(object[acc + "RS"]).escapeHTML();
                }
            }
        };

        NRS.dataLoaded = function (data, noPageLoad) {
            var $el = $("#" + NRS.currentPage + "_contents");

            if ($el.length) {
                $el.empty().append(data);
            } else {
                try {
                    $el = $("#" + NRS.currentPage + "_table");
                    $el.find("tbody").empty().append(data);
                    $el.find('[data-toggle="tooltip"]').tooltip();
                } catch (e) {
                    NRS.logException(e);
                    NRS.logConsole("Raw data: " + data);
                    $el.find("tbody").empty().append("<tr><td>Error processing table data: " + e.message + "</td></tr>");
                }
            }

            NRS.dataLoadFinished($el);

            if (!noPageLoad) {
                NRS.pageLoaded();
            }
        };

        NRS.dataLoadFinished = function ($el, fadeIn) {
            var $ancestor = $el.parents('.data-container');

            if (fadeIn) {
                $ancestor.hide();
            }

            $ancestor.removeClass("data-loading");

            var extra = $ancestor.data("extra");

            var empty = false;

            if ($el.is("table")) {
                if ($el.find("tbody tr").length > 0) {
                    $ancestor.removeClass("data-empty");
                    if ($ancestor.data("no-padding")) {
                        $ancestor.parent().addClass("no-padding");
                    }

                    if (extra) {
                        $(extra).show();
                    }
                } else {
                    empty = true;
                }
            } else {
                if ($.trim($el.html()).length == 0) {
                    empty = true;
                }
            }

            if (empty) {
                $ancestor.addClass("data-empty");
                if ($ancestor.data("no-padding")) {
                    $ancestor.parent().removeClass("no-padding");
                }
                if (extra) {
                    $(extra).hide();
                }
            } else {
                $ancestor.removeClass("data-empty");
            }

            if (fadeIn) {
                $ancestor.stop(true, true).fadeIn(400, function () {
                    $ancestor.show();
                });
            }
        };

        NRS.createInfoTable = function (data, options) {
            if (!options) {
                options = {};
            }
            var orderedData = {};
            Object.keys(data).sort().forEach(function (key) {
                orderedData[key] = data[key];
            });
            data = orderedData;
            var fixed = options.fixed;
            var chain = options.chain ? NRS.getChain(options.chain) : NRS.getActiveChain();
            var rows = "";
            for (var key in data) {
                if (!data.hasOwnProperty(key)) {
                    continue;
                }
                var value = data[key];

                var match = key.match(/(.*)(MTA|QNT|RS)$/);
                var type = "";

                if (match && match[1]) {
                    key = match[1];
                    type = match[2];
                }
                var origKey = key;
                key = key.replace(/\s+/g, "").replace(/([A-Z])/g, function ($1) {
                    return "_" + $1.toLowerCase();
                });

                //no need to mess with input, already done if Formatted is at end of key
                if (/_formatted_html$/i.test(key)) {
                    key = key.replace("_formatted_html", "");
                    value = String(value);
                } else if (/_formatted$/i.test(key)) {
                    key = key.replace("_formatted", "");
                    value = NRS.escapeRespStr(value);
                } else if ((key == "quantity" || key == "units" || key == "initial_buy_supply" || key == "initial_sell_supply" ||
                    key == "total_buy_limit" || key == "total_sell_limit" || key == "units_exchanged" || key == "total_exchanged" ||
                    key == "initial_units" || key == "reserve_units" || key == "max_units" || key == "quantity_traded" || key == "initial_quantity") && $.isArray(value)) {
                    if ($.isArray(value)) {
                        value = NRS.formatQuantity(value[0], value[1]);
                    } else {
                        value = NRS.formatQuantity(value, 0);
                    }
                } else if (key == "price" || key == "total" || key == "amount" || key == "fee" || key == "refund" || key == "discount") {
                    value = NRS.formatAmount(new BigInteger(String(value)), false, false, false, chain.decimals) + " " + chain.name;
                } else if (key == "sender" || key == "recipient" || key == "account" || key == "seller" || key == "buyer" || key == "lessee") {
                    value = "<a href='#' data-user='" + NRS.escapeRespStr(value) + "' class='show_account_modal_action'>" + NRS.getAccountTitle(value) + "</a>";
                } else if (key == "request_processing_time") { /* Skip from displaying request processing time */
                    continue;
                } else {
                    value = NRS.escapeRespStr(value).nl2br();
                }

                var keyText = $.t(key);
                if (keyText.indexOf("translation:") == 0) {
                    keyText = origKey;
                }
                keyText = keyText.escapeHTML();
                rows += "<tr><td style='font-weight:bold" + (fixed ? ";width:150px" : "") + "'>" + keyText + (type ? " " + type.escapeHTML() : "") + ":</td><td style='width:70%;word-break:break-all'>" + value + "</td></tr>";
            }

            return rows;
        };

        NRS.getSelectedText = function () {
            var t = "";
            if (window.getSelection) {
                // TODO works only for webkit browsers, always returns empty string on Edge and Firefox
                t = window.getSelection().toString();
            } else if (document.getSelection) {
                // Never used?
                t = document.getSelection().toString();
            } else if (document.selection) {
                // Never used?
                t = document.selection.createRange().text;
            }
            return t;
        };

        NRS.showMore = function ($el) {
            if (!$el) {
                $el = $("#" + NRS.currentPage + "_contents");
                if (!$el.length) {
                    $el = $("#" + NRS.currentPage + "_table");
                }
            }
            var adjustheight = 40;
            var moreText = "Show more...";
            var lessText = "Show less...";

            $el.find(".showmore > .moreblock").each(function () {
                if ($(this).height() > adjustheight) {
                    $(this).css("height", adjustheight).css("overflow", "hidden");
                    $(this).parent(".showmore").append(' <a href="#" class="adjust"></a>');
                    $(this).parent(".showmore").find("a.adjust").text(moreText).click(function (e) {
                        e.preventDefault();

                        if ($(this).text() == moreText) {
                            $(this).parents("div:first").find(".moreblock").css('height', 'auto').css('overflow', 'visible');
                            $(this).parents("div:first").find("p.continued").css('display', 'none');
                            $(this).text(lessText);
                        } else {
                            $(this).parents("div:first").find(".moreblock").css('height', adjustheight).css('overflow', 'hidden');
                            $(this).parents("div:first").find("p.continued").css('display', 'block');
                            $(this).text(moreText);
                        }
                    });
                }
            });
        };

        NRS.showFullDescription = function ($el) {
            $el.addClass("open").removeClass("closed");
            $el.find(".description_toggle").text("Less...");
        };

        NRS.showPartialDescription = function ($el) {
            if ($el.hasClass("open") || $el.height() > 40) {
                $el.addClass("closed").removeClass("open");
                $el.find(".description_toggle").text("More...");
            } else {
                $el.find(".description_toggle").text("");
            }
        };

        NRS.collapseSideBar = function () {
            var leftSide = $(".left-side");
            var rightSide = $(".right-side");
            if ($(window).width() <= 992) {
                var rowOffCanvas = $('.row-offcanvas');
                rowOffCanvas.removeClass('active');
                leftSide.removeClass("collapse-left");
                rightSide.removeClass("strech");
                rowOffCanvas.removeClass("relative");
            } else {
                //Else, enable content streching
                leftSide.addClass("collapse-left");
                rightSide.addClass("strech");
            }
        };

        NRS.expandSidebar = function () {
            var leftSide = $(".left-side");
            var rightSide = $(".right-side");
            if ($(window).width() <= 992) {
                let rowOffCanvas = $('.row-offcanvas');
                rowOffCanvas.addClass('active');
                leftSide.removeClass("collapse-left");
                rightSide.removeClass("strech");
                rowOffCanvas.addClass("relative");
            } else {
                //Else, enable content streching
                leftSide.removeClass("collapse-left");
                rightSide.removeClass("strech");
            }
        };

        NRS.translateServerError = function (response) {
            var match;
            if (!response.errorDescription) {
                if (response.errorMessage) {
                    response.errorDescription = response.errorMessage;
                } else if (response.error) {
                    if (typeof response.error == "string") {
                        response.errorDescription = response.error;
                        response.errorCode = -1;
                    } else {
                        return $.t("error_unknown");
                    }
                } else {
                    return $.t("error_unknown");
                }
            }

            switch (response.errorCode) {
                case -1:
                    switch (response.errorDescription) {
                        case "Invalid ordinary payment":
                            return $.t("error_invalid_ordinary_payment");
                        case "Missing alias name":
                            return $.t("error_missing_alias_name");
                        case "Transferring aliases to Genesis account not allowed":
                            return $.t("error_alias_transfer_genesis");
                        case "Ask order already filled":
                            return $.t("error_ask_order_filled");
                        case "Bid order already filled":
                            return $.t("error_bid_order_filled");
                        case "Only text encrypted messages allowed":
                            return $.t("error_encrypted_text_messages_only");
                        case "Missing feedback message":
                            return $.t("error_missing_feedback_message");
                        case "Only text public messages allowed":
                            return $.t("error_public_text_messages_only");
                        case "Purchase does not exist yet or not yet delivered":
                            return $.t("error_purchase_delivery");
                        case "Purchase does not exist or is not delivered or is already refunded":
                            return $.t("error_purchase_refund");
                        case "Recipient account does not have a public key, must attach a public key announcement":
                            return $.t("error_recipient_no_public_key_announcement");
                        case "Transaction is not signed yet":
                            return $.t("error_transaction_not_signed");
                        case "Transaction already signed":
                            return $.t("error_transaction_already_signed");
                        case "PublicKeyAnnouncement cannot be attached to transactions with no recipient":
                            return $.t("error_public_key_announcement_no_recipient");
                        case "Announced public key does not match recipient accountId":
                            return $.t("error_public_key_different_account_id");
                        case "Public key for this account has already been announced":
                            return $.t("error_public_key_already_announced");
                        default:
                            if (response.errorDescription.indexOf("Alias already owned by another account") != -1) {
                                return $.t("error_alias_owned_by_other_account");
                            } else if (response.errorDescription.indexOf("Invalid alias sell price") != -1) {
                                return $.t("error_invalid_alias_sell_price");
                            } else if (response.errorDescription.indexOf("Alias hasn't been registered yet") != -1) {
                                return $.t("error_alias_not_yet_registered");
                            } else if (response.errorDescription.indexOf("Alias doesn't belong to sender") != -1) {
                                return $.t("error_alias_not_from_sender");
                            } else if (response.errorDescription.indexOf("Alias is owned by account other than recipient") != -1) {
                                return $.t("error_alias_not_from_recipient");
                            } else if (response.errorDescription.indexOf("Alias is not for sale") != -1) {
                                return $.t("error_alias_not_for_sale");
                            } else if (response.errorDescription.indexOf("Invalid alias name") != -1) {
                                return $.t("error_invalid_alias_name");
                            } else if (response.errorDescription.indexOf("Invalid URI length") != -1) {
                                return $.t("error_invalid_alias_uri_length");
                            } else if (response.errorDescription.indexOf("Invalid ask order") != -1) {
                                return $.t("error_invalid_ask_order");
                            } else if (response.errorDescription.indexOf("Invalid bid order") != -1) {
                                return $.t("error_invalid_bid_order");
                            } else if (response.errorDescription.indexOf("Goods price or quantity changed") != -1) {
                                return $.t("error_dgs_price_quantity_changed");
                            } else if (response.errorDescription.indexOf("Invalid digital goods price change") != -1) {
                                return $.t("error_invalid_dgs_price_change");
                            } else if (response.errorDescription.indexOf("Invalid digital goods refund") != -1) {
                                return $.t("error_invalid_dgs_refund");
                            } else if (response.errorDescription.indexOf("Purchase does not exist yet, or already delivered") != -1) {
                                return $.t("error_purchase_not_exist_or_delivered");
                            } else if (response.errorDescription.match(/Goods.*not yet listed or already delisted/)) {
                                return $.t("error_dgs_not_listed");
                            } else if (response.errorDescription.match(/Delivery deadline has already expired/)) {
                                return $.t("error_dgs_delivery_deadline_expired");
                            } else if (response.errorDescription.match(/Invalid effective balance leasing:.*recipient account.*not found or no public key published/)) {
                                return $.t("error_invalid_balance_leasing_no_public_key");
                            } else if (response.errorDescription.indexOf("Invalid effective balance leasing") != -1) {
                                return $.t("error_invalid_balance_leasing");
                            } else if (response.errorDescription.match(/Wrong buyer for.*expected:.*/)) {
                                return $.t("error_wrong_buyer_for_alias");
                            } else {
                                return response.errorDescription;
                            }
                    }
                case 1:
                    switch (response.errorDescription) {
                        case "This request is only accepted using POST!":
                            return $.t("error_post_only");
                        case "Incorrect request":
                            return $.t("error_incorrect_request");
                        default:
                            return response.errorDescription;
                    }
                case 2:
                    return response.errorDescription;
                case 3:
                    match = response.errorDescription.match(/"([^"]+)" not specified/i);
                    if (match && match[1]) {
                        return $.t("error_not_specified", {
                            "name": NRS.getTranslatedFieldName(match[1]).toLowerCase()
                        }).capitalize();
                    }

                    match = response.errorDescription.match(/At least one of \[(.*)\] must be specified/i);
                    if (match && match[1]) {
                        var fieldNames = match[1].split(",");
                        var translatedFieldNames = [];
                        for (var i = 0; i < fieldNames.length; i++) {
                            translatedFieldNames.push(NRS.getTranslatedFieldName(fieldNames[i].toLowerCase()));
                        }

                        var translatedFieldNamesJoined = translatedFieldNames.join(", ");

                        return $.t("error_not_specified", {
                            "names": translatedFieldNamesJoined,
                            "count": translatedFieldNames.length
                        }).capitalize();
                    } else {
                        return response.errorDescription;
                    }
                case 4:
                    match = response.errorDescription.match(/Incorrect "(.*)"(.*)/i);
                    if (match && match[1] && match[2]) {
                        return $.t("error_incorrect_name", {
                            "name": NRS.getTranslatedFieldName(match[1]).toLowerCase(),
                            "reason": match[2]
                        }).capitalize();
                    } else {
                        return response.errorDescription;
                    }
                case 5:
                    match = response.errorDescription.match(/Unknown (.*)/i);
                    if (match && match[1]) {
                        return $.t("error_unknown_name", {
                            "name": NRS.getTranslatedFieldName(match[1]).toLowerCase()
                        }).capitalize();
                    }

                    if (response.errorDescription == "Account is not forging") {
                        return $.t("error_not_forging");
                    } else {
                        return response.errorDescription;
                    }
                case 6:
                    switch (response.errorDescription) {
                        case "Not enough assets":
                            return $.t("error_not_enough_assets");
                        case "Not enough funds":
                            if (response.amount !== undefined) {
                                return $.t("error_not_enough_funds_explained", {
                                    amount: NRS.formatAmount(response.amount),
                                    fee: NRS.formatAmount(response.fee),
                                    balance: NRS.formatAmount(response.balance),
                                    diff: NRS.formatAmount(response.diff),
                                    chain: NRS.getChainName(response.chain)
                                });
                            } else {
                                return $.t("error_not_enough_funds");
                            }
                        default:
                            return response.errorDescription;
                    }
                case 7:
                    if (response.errorDescription == "Not allowed") {
                        return $.t("error_not_allowed");
                    } else {
                        return response.errorDescription;
                    }
                case 8:
                    switch (response.errorDescription) {
                        case "Goods have not been delivered yet":
                            return $.t("error_goods_not_delivered_yet");
                        case "Feedback already sent":
                            return $.t("error_feedback_already_sent");
                        case "Refund already sent":
                            return $.t("error_refund_already_sent");
                        case "Purchase already delivered":
                            return $.t("error_purchase_already_delivered");
                        case "Decryption failed":
                            return $.t("error_decryption_failed");
                        case "No attached message found":
                            return $.t("error_no_attached_message");
                        case "recipient account does not have public key":
                            return $.t("error_recipient_no_public_key", {"coin": NRS.getActiveChainName()});
                        default:
                            return response.errorDescription;
                    }
                case 9:
                    if (response.errorDescription == "Feature not available") {
                        return $.t("error_feature_not_available");
                    } else {
                        return response.errorDescription;
                    }
                case 10:
                    if (response.errorDescription == "Encrypted configuration data does not exist") {
                        return $.t("error_process_file_incorrect");
                    } else {
                        return response.errorDescription;
                    }
                default:
                    return response.errorDescription;
            }
        };

        NRS.getTranslatedFieldName = function (name) {
            var nameKey = String(name).replace(/MTA|QNT|RS$/, "").replace(/\s+/g, "").replace(/([A-Z])/g, function ($1) {
                return "_" + $1.toLowerCase();
            });

            if (nameKey.charAt(0) == "_") {
                nameKey = nameKey.substring(1);
            }

            if ($.i18n && $.i18n.exists(nameKey)) {
                return $.t(nameKey).escapeHTML();
            } else {
                return nameKey.replace(/_/g, " ").escapeHTML();
            }
        };

        NRS.isControlKey = function (charCode) {
            return !(charCode >= 32 || charCode == 10 || charCode == 13);
        };

        // http://stackoverflow.com/questions/12518830/java-string-getbytesutf8-javascript-analog
        NRS.getUtf8Bytes = function (str) {
            //noinspection JSDeprecatedSymbols
            var utf8 = unescape(encodeURIComponent(str));
            var arr = [];
            for (var i = 0; i < utf8.length; i++) {
                arr[i] = utf8.charCodeAt(i);
            }
            return arr;
        };

        NRS.getTransactionStatusIcon = function (phasedEntity) {
            var statusIcon;
            if (phasedEntity.expectedCancellation == true) {
                statusIcon = "<i class='far fa-ban' title='" + $.t("cancelled") + "'></i>";
            } else if (phasedEntity.phased == true) {
                statusIcon = "<i class='far fa-gavel' title='" + $.t("phased") + "'></i>";
            } else if (phasedEntity.phased == false) {
                statusIcon = "<i class='far fa-circle' title='" + $.t("unconfirmed") + "'></i>";
            } else {
                statusIcon = "<i class='fa fa-circle' title='" + $.t("confirmed") + "'></i>";
            }
            return statusIcon;
        };

        NRS.getAccountForDecryption = function (transaction, recipient, sender) {
            if (!recipient && transaction.recipient == NRS.account) {
                return transaction.sender;
            }
            if (transaction[recipient] == NRS.account) {
                return transaction.sender || transaction[sender];
            }
            if (!sender && transaction.sender == NRS.account) {
                return transaction.recipient;
            }
            if (transaction[sender] == NRS.account) {
                return transaction.recipient || transaction[recipient];
            }
            return null;
        };

        // http://stackoverflow.com/questions/18729405/how-to-convert-utf8-string-to-byte-array
        NRS.strToUTF8Arr = function (str) {
            var utf8 = [];
            for (var i = 0; i < str.length; i++) {
                var charcode = str.charCodeAt(i);
                if (charcode < 0x80) utf8.push(charcode);
                else if (charcode < 0x800) {
                    utf8.push(0xc0 | (charcode >> 6),
                        0x80 | (charcode & 0x3f));
                } else if (charcode < 0xd800 || charcode >= 0xe000) {
                    utf8.push(0xe0 | (charcode >> 12),
                        0x80 | ((charcode >> 6) & 0x3f),
                        0x80 | (charcode & 0x3f));
                }
                // surrogate pair
                else {
                    i++;
                    // UTF-16 encodes 0x10000-0x10FFFF by
                    // subtracting 0x10000 and splitting the
                    // 20 bits of 0x0-0xFFFFF into two halves
                    charcode = 0x10000 + (((charcode & 0x3ff) << 10)
                        | (str.charCodeAt(i) & 0x3ff));
                    utf8.push(0xf0 | (charcode >> 18),
                        0x80 | ((charcode >> 12) & 0x3f),
                        0x80 | ((charcode >> 6) & 0x3f),
                        0x80 | (charcode & 0x3f));
                }
            }
            return utf8;
        };

        function byteArrayToBigInteger(byteArray) {
            var value = new BigInteger("0", 10);
            for (var i = byteArray.length - 1; i >= 0; i--) {
                value = value.multiply(new BigInteger("256", 10)).add(new BigInteger(byteArray[i].toString(10), 10));
            }
            return value;
        }

        NRS.initialCaps = function (str) {
            if (!str || str == "") {
                return str;
            }
            var firstChar = str.charAt(0).toUpperCase();
            if (str.length == 1) {
                return firstChar;
            }
            return firstChar + str.slice(1);
        };

        NRS.addEllipsis = function (str, length) {
            if (!str || str == "" || str.length <= length) {
                return str;
            }
            return str.substring(0, length) + "...";
        };

        NRS.generateToken = async function (message, privateKey, callback) {
            var messageBytes = NRS.getUtf8Bytes(message);
            var ts = NRS.toEpochTime();
            if (NRS.isHardwareTokenSigningEnabled()) {
                let token = await NRS.signTokenOnHardwareWallet(ts, converters.byteArrayToHexString(messageBytes));
                if (!token) {
                    $.growl($.t("hardware_wallet_failed_to_generate_token"));
                    return;
                }
                callback(token);
                return;
            }
            var pubKeyBytes = converters.hexStringToByteArray(NRS.getPublicKeyFromPrivateKey(privateKey));

            var token = pubKeyBytes;
            var tsb = [];
            tsb[0] = ts & 0xFF;
            tsb[1] = (ts >> 8) & 0xFF;
            tsb[2] = (ts >> 16) & 0xFF;
            tsb[3] = (ts >> 24) & 0xFF;

            messageBytes = messageBytes.concat(pubKeyBytes, tsb);
            let signingPromise = NRS.getSigningPromise(converters.byteArrayToHexString(messageBytes), privateKey);
            signingPromise.then(function (signature) {
                if (signature === null) {
                    $.growl($.t("hardware_wallet_not_supported"));
                    return;
                }
                token = token.concat(tsb, converters.hexStringToByteArray(signature));
                var buf = "";
                for (var ptr = 0; ptr < 100; ptr += 5) {
                    var nbr = [];
                    nbr[0] = token[ptr] & 0xFF;
                    nbr[1] = token[ptr + 1] & 0xFF;
                    nbr[2] = token[ptr + 2] & 0xFF;
                    nbr[3] = token[ptr + 3] & 0xFF;
                    nbr[4] = token[ptr + 4] & 0xFF;
                    var number = byteArrayToBigInteger(nbr);
                    if (number < 32) {
                        buf += "0000000";
                    } else if (number < 1024) {
                        buf += "000000";
                    } else if (number < 32768) {
                        buf += "00000";
                    } else if (number < 1048576) {
                        buf += "0000";
                    } else if (number < 33554432) {
                        buf += "000";
                    } else if (number < 1073741824) {
                        buf += "00";
                    } else if (number < 34359738368) {
                        buf += "0";
                    }
                    buf += number.toString(32);
                }
                callback(buf);
            });
        };

        NRS.versionCompare = function (v1, v2) {
            if (v2 == undefined) {
                return -1;
            } else if (v1 == undefined) {
                return -1;
            }

            //https://gist.github.com/TheDistantSea/8021359 (based on)
            var v1last = v1.slice(-1);
            var v2last = v2.slice(-1);

            if (v1last == 'e') {
                v1 = v1.substring(0, v1.length - 1);
            } else {
                v1last = '';
            }

            if (v2last == 'e') {
                v2 = v2.substring(0, v2.length - 1);
            } else {
                v2last = '';
            }

            var v1parts = v1.split('.');
            var v2parts = v2.split('.');

            function isValidPart(x) {
                return /^\d+$/.test(x);
            }

            if (!v1parts.every(isValidPart) || !v2parts.every(isValidPart)) {
                return NaN;
            }

            v1parts = v1parts.map(Number);
            v2parts = v2parts.map(Number);

            for (var i = 0; i < v1parts.length; ++i) {
                if (v2parts.length == i) {
                    return 1;
                }
                if (v1parts[i] != v2parts[i]) {
                    if (v1parts[i] > v2parts[i]) {
                        return 1;
                    } else {
                        return -1;
                    }
                }
            }

            if (v1parts.length != v2parts.length) {
                return -1;
            }

            if (v1last && v2last) {
                return 0;
            } else if (v1last) {
                return 1;
            } else if (v2last) {
                return -1;
            } else {
                return 0;
            }
        };

        /**
         * Escapes all strings in a response object
         * @param obj the object to escape
         * @param exclusions keys to exclude
         */
        NRS.escapeResponseObjStrings = function (obj, exclusions) {
            for (var key in obj) {
                if (!obj.hasOwnProperty(key)) {
                    continue;
                }
                if (exclusions && exclusions.indexOf(key) >= 0) {
                    continue;
                }
                var val = obj[key];
                if (typeof val === 'string') {
                    obj[key] = String(val).escapeHTML();
                } else if (typeof val === 'object') {
                    NRS.escapeResponseObjStrings(obj[key], exclusions);
                }
            }
        };

        /**
         * Escapes a string that was returned in response from the server.
         * This is used to avoid the double escaping of strings since the response strings started to be escaped in a global
         * level because of the proxy feature
         * @param val
         */
        NRS.escapeRespStr = function (val) {
            return String(val).unescapeHTML().escapeHTML();
        };

        NRS.unescapeRespStr = function (val) {
            return String(val).unescapeHTML();
        };

        NRS.getRandomPermutation = function (array) {
            var currentIndex = array.length, temporaryValue, randomIndex;

            // While there remain elements to shuffle...
            while (0 !== currentIndex) {
                // Pick a remaining element...
                randomIndex = Math.floor(Math.random() * currentIndex);
                currentIndex -= 1;

                // And swap it with the current element.
                temporaryValue = array[currentIndex];
                array[currentIndex] = array[randomIndex];
                array[randomIndex] = temporaryValue;
            }
            return array;
        };

        NRS.isErrorResponse = function (response) {
            return response.errorCode || response.errorDescription || response.errorMessage || response.error;
        };

        NRS.getErrorMessage = function (response) {
            return response.errorDescription || response.errorMessage || response.error;
        };

        NRS.getMandatoryParams = function () {
            return {
                feeMTA: "100000000",
                feeRateMTAPerFXT: "1",
                deadline: "15"
            }
        };

        NRS.isRsAccount = function (account) {
            return NRS.isRsAccountImpl(account, NRS.constants.ACCOUNT_RS_MATCH);
        };

        NRS.isRsAccountImpl = function (account, regex) {
            return regex.test(account);
        };

        NRS.isNumericAccount = function (account) {
            return NRS.isNumericAccountImpl(account, NRS.constants.ACCOUNT_NUMERIC_MATCH);
        };

        NRS.isNumericAccountImpl = function (account, regex) {
            return regex.test(account);
        };

        NRS.getAccountMask = function (c) {
            switch (c) {
                case "*":
                    return NRS.deviceSettings.account_prefix + "-****-****-****-*****";
                case "_":
                    return NRS.deviceSettings.account_prefix + "-____-____-____-_____";
                default:
                    return NRS.deviceSettings.account_prefix + "-";
            }
        };

        NRS.getLegacyAccountPrefix = function () {
            return "NXT-";
        };

        NRS.nxtToAccountPrefix = function (account) {
            var nxtPrefix = "NXT-";
            if (!account || account.length <= nxtPrefix.length || account.substring(0, nxtPrefix.length).toUpperCase() !== nxtPrefix) {
                return account;
            }
            return NRS.getAccountMask() + account.substring(nxtPrefix.length);
        };

        NRS.convertNumericToRSAccountFormat = function (account) {
            if (NRS.isRsAccount(account)) {
                return String(account).escapeHTML();
            } else {
                var address = NRS.createRsAddress();
                if (address.set(account)) {
                    return address.toString().escapeHTML();
                } else {
                    return "";
                }
            }
        };

        NRS.createRsAddress = function () {
            return new NxtAddress(NRS);
        };

        NRS.isSameAccountAddress = function (address1, address2) {
            if (address1 === address2) {
                return true;
            }
            if (typeof address1 !== "string" || typeof address2 !== "string") {
                return false;
            }
            if (address1.split("-").length === 5) {
                address1 = address1.substring(address1.indexOf("-"));
            }
            if (address2.split("-").length === 5) {
                address2 = address2.substring(address2.indexOf("-"));
            }
            return address1 === address2;
        }

        NRS.resetModalTablesOnAccountSwitch = function () {
            $(".user_info_modal_content").hide();
            $("ul.nav li.active").removeClass("active");
            $("#user_info_transactions").addClass("active");
            setTimeout(function () {
                $(".user_info_modal_content:not(#user_info_modal_transactions) table tbody").empty();
                $(".user_info_modal_content:not(.data-loading,.data-never-loading,#user_info_modal_transactions)").addClass("data-loading");
            }, 100);
        };

        function print($frame) {
            if (NRS.isWindowPrintSupported()) {
                // Always prints a single blank page on firefox 65.0.1/ Windows 10/Multiple printers (tried many things, no idea), works on Chrome and Edge
                window.frames['paperWalletFrame'].focus();
                window.frames['paperWalletFrame'].print();
                $(".printFrame").remove();
            } else {
                if (window.java) {
                    // Open the paper wallet in a new tab using Java FX
                    java.renderPaperWallet("<html lang=''>" + $frame.html() + "</html>");
                    $(".printFrame").remove();
                } else {
                    // Open the paper wallet in a new tab
                    var win = window.open("", "_blank");
                    win.document.body.innerHTML = $frame.html();
                    win.focus();
                    $(".printFrame").remove();
                }
            }
        }

        async function loadImage(img) {
            return new Promise((resolve) => {
                $(img).load(resolve);
            })
        }

        NRS.printPaperWallet = async function (secret, secretType, n, k) {
            let $frame = $("<iframe>", {
                id: "paperWalletFrame",
                name: "paperWalletFrame",
                class: "printFrame"
            }).appendTo("body").contents().find("body");

            let $pageHeader = $("<h2>" + $.t("munhumutapa_paper_wallet") + "</h2>");
            $frame.append($pageHeader);

            let $secretHeader = $("<h3>" + $.t(secretType) + "</h3>");
            let $secretText = $("<div style='font-size: 14px; font-family: monospace; word-break: break-all;'></div>");
            $secretText.text(secret);
            let secretImg = NRS.generateQRCode(null, secret, 2, 4);
            await loadImage(secretImg);
            $frame.append($secretHeader).append($secretText).append(secretImg);
            if (secretType === "passphrase") {
                let privateKey = NRS.getPrivateKey(secret);
                let account = NRS.getAccountId(privateKey, true);
                let $accountHeader = $("<h3>" + $.t('account') + "</h3>");
                let $accountText = $("<div></div>");
                $accountText.html(account);
                let accountImg = NRS.generateQRCode(null, account, 2, 4);
                await loadImage(accountImg);
                $frame.append($accountHeader).append($accountText).append(accountImg);
            }

            // Prepare the paper wallet first page
            if (!n) {
                print($frame);
                return;
            }

            // Split the passphrase and create one page per piece
            let $pageBreak = "<p style='page-break-before: always'>";
            let pieces = sss.splitPhrase(secret, n, k);
            let pieceImages = new Array(n);
            for (let i = 0; i < pieces.length; i++) {
                pieceImages[i] = NRS.generateQRCode(null, pieces[i], 2, 4);
                await loadImage(pieceImages[i]);
                var $pieceHeader = $("<h3><span>" + $.t("shared_secret") + "</span><span>&nbsp;" + (i + 1) + "</span></h3>");
                var $pieceText = $("<div style='font-size: 10px; font-family: monospace;'>" + pieces[i] + "</div><p>");
                $frame.append($pageBreak).append("<div><p>").append($pieceHeader).append($pieceText).append(pieceImages[i]).append("</div>");
            }
            print($frame);
        };

        NRS.prepareTextDownloadLink = function($downloadLink, textContent, fileName) {
            if (window.java) {
                $downloadLink.off('click');
                $downloadLink.on('click', (e) => {
                    e.preventDefault();
                    window.java.downloadTextFile(textContent, fileName);
                });
            } else {
                const jsonAsBlob = new Blob([textContent], {type: 'text/plain'});
                $downloadLink.prop("download", fileName);
                $downloadLink.prop('href', window.URL.createObjectURL(jsonAsBlob));
            }
        };

        NRS.preparePage = function() {
            if (!NRS.account) {
                // setup page for access when user is not logged in
                $("html, body").removeClass("lockscreen");
                $("body").addClass("unlogged-access");
                const $visible_modal = $(".modal.in");
                if ($visible_modal.length) {
                    $visible_modal.modal("hide");
                }
            }
        };

        NRS.returnToLogin = function() {
            $(".page:visible").hide();
            $("html, body").addClass("lockscreen");
            $(".unlogged-access").removeClass("unlogged-access");
            $("#dashboard_page").show();
            NRS.currentPage = "dashboard";
            const $visible_modal = $(".modal.in");
            if ($visible_modal.length) {
                $visible_modal.modal("hide");
            }
        };

        NRS.calculateSecret = function (privateKey, nonce, blockId) {
            var secretStr = privateKey + nonce + blockId;
            sha256 = CryptoJS.algo.SHA256.create();
            sha256.update(converters.byteArrayToWordArrayEx(converters.stringToByteArray(secretStr)));
            return converters.byteArrayToHexString(converters.wordArrayToByteArrayEx(sha256.finalize()));
        };

        NRS.generateSecret = function (secretPhrase, callback) {
            var nonce = NRS.settings.secretNonce;
            NRS.sendRequest("getBlock", {
                "height": NRS.lastBlockHeight - nonce
            }, function (response) {
                if (response.errorCode) {
                    callback({error: response.errorDescription});
                } else {
                    var secret = NRS.calculateSecret(secretPhrase, nonce, response.block);
                    var result = {secret: secret, blockId: response.block, nonce: nonce};
                    ++nonce == 10000 ? nonce = 1 : nonce;
                    NRS.settings.secretNonce = nonce;
                    callback(result);
                }
            });
        };

        NRS.flattenObject = function (obj, exclusions, duplicates) {
            return flattenObject(obj, exclusions, duplicates);
        };

        function flattenObject(obj, exclusions, duplicates) {
            var toReturn = {};
            for (var i in obj) {
                if (!obj.hasOwnProperty(i)) {
                    continue
                }
                if ((typeof obj[i]) == 'object' && obj[i] !== null) {
                    var flatObject = NRS.flattenObject(obj[i], exclusions, duplicates);
                    for (var x in flatObject) {
                        if (!flatObject.hasOwnProperty(x)) {
                            continue;
                        }
                        toReturn[x] = flatObject[x];
                    }
                } else {
                    var include = true;
                    if (exclusions !== undefined) {
                        for (var j = 0; j < exclusions.length; j++) {
                            if (i.indexOf(exclusions[j]) == 0) {
                                include = false;
                                break;
                            }
                        }
                    }
                    if (duplicates !== undefined) {
                        for (j = 0; j < duplicates.length; j++) {
                            if (obj[i + duplicates[j]] !== undefined) {
                                include = false;
                                break;
                            }
                        }
                    }
                    if (include) {
                        toReturn[i] = obj[i];
                    }
                }
            }
            return toReturn;
        }

        // See RFC 5652, section 6.3 https://tools.ietf.org/html/rfc5652#section-6.3
        NRS.pkcs7Pad = function (plaintext) {
            const padding = PADDING[(plaintext.byteLength % 16) || 0];
            const result = new Uint8Array(plaintext.byteLength + padding.length);

            result.set(plaintext);
            result.set(padding, plaintext.byteLength);

            return result;
        };

        NRS.pkcs7Unpad = function (padded) {
            let padLength = padded[padded.byteLength - 1];
            if (padLength < 1 || padLength > 16) {
                return null;
            }
            for (let i = 0; i < padLength; i++) {
                if (padded[padded.byteLength - 1 - i] !== padLength) {
                    return null;
                }
            }
            return padded.subarray(0, padded.byteLength - padLength);
        };

        // pre-define the padding values
        PADDING = [
            [16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16],
            [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15],
            [14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14],
            [13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13],
            [12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12],
            [11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11],
            [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
            [9, 9, 9, 9, 9, 9, 9, 9, 9],
            [8, 8, 8, 8, 8, 8, 8, 8],
            [7, 7, 7, 7, 7, 7, 7],
            [6, 6, 6, 6, 6, 6],
            [5, 5, 5, 5, 5],
            [4, 4, 4, 4],
            [3, 3, 3],
            [2, 2],
            [1]
        ];

        return NRS;
    }(isNode ? client : NRS || {}, jQuery));

    if (isNode) {
        module.exports = NRS;
    }
});