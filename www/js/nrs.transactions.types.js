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
    NRS = (function (NRS, $) {

        NRS.transactionTypes = {
            "-4": {
            'title': "Coin Exchange",
            'i18nKeyTitle': 'coin_exchange',
            'iconHTML': "<i class='far fa-exchange-alt'></i>",
            'chainType': "parent",
            'subTypes': {
                0: {
                    'title': "Issue Order",
                    'i18nKeyTitle': 'issue_order',
                    'iconHTML': "<i class='far fa-comment-alt-dollar'></i>",
                    'receiverPage': 'open_coin_orders'
                },
                1: {
                    'title': "Cancel Order",
                    'i18nKeyTitle': 'cancel_order',
                    'iconHTML': "<i class='far fa-times'></i>",
                    'receiverPage': 'open_coin_orders'
                }
            }
        },
        "-3": {
            'title': "Account Control",
            'i18nKeyTitle': 'account_control',
            'iconHTML': '<i class="ion-locked"></i>',
            'chainType': "parent",
            'subTypes': {
                0: {
                    'title': "Balance Leasing",
                    'i18nKeyTitle': 'balance_leasing',
                    'iconHTML': '<i class="far fa-hands-usd"></i>',
                    'receiverPage': "transactions"
                }
            }
        },
        "-2": {
            'title': "Payment",
            'i18nKeyTitle': 'payment',
            'iconHTML': "<i class='ion-calculator'></i>",
            'chainType': "parent",
            'subTypes': {
                0: {
                    'title': "Ordinary Payment",
                    'i18nKeyTitle': 'ordinary_payment',
                    'iconHTML': "<i class='far fa-hand-holding-usd'></i>",
                    'receiverPage': 'transactions'
                }
            }
        },
        "-1": {
            'title': "Beta Chain Block",
            'i18nKeyTitle': 'beta_chain_block',
            'iconHTML': "<i class='far fa-cube'></i>",
            'chainType': "parent",
            'subTypes': {
                0: {
                    'title': "Beta Chain Block",
                    'i18nKeyTitle': 'beta_chain_block',
                    'iconHTML': "<i class='far fa-cube'></i>",
                    'receiverPage': 'transactions'
                }
            }
        },
        0: {
            'title': "Payment",
            'i18nKeyTitle': 'payment',
            'iconHTML': "<i class='ion-calculator'></i>",
            'chainType': "beta",
            'subTypes': {
                0: {
                    'title': "Ordinary Payment",
                    'i18nKeyTitle': 'ordinary_payment',
                    'iconHTML': "<i class='far fa-hand-holding-usd'></i>",
                    'receiverPage': 'transactions'
                }
            }
        },
        1: {
            'title': "Messaging",
            'i18nKeyTitle': 'messaging',
            'iconHTML': "<i class='fa fa-envelope-square'></i>",
            'chainType': "beta",
            'subTypes': {
                0: {
                    'title': "Arbitrary Message",
                    'i18nKeyTitle': 'arbitrary_message',
                    'iconHTML': "<i class='far fa-envelope'></i>",
                    'receiverPage': 'messages'
                }
            }
        },
        2: {
            'title': "Asset Exchange",
            'i18nKeyTitle': 'asset_exchange',
            'iconHTML': '<i class="far coins"></i>',
            'chainType': "beta",
            'subTypes': {
                0: {
                    'title': "Asset Issuance",
                    'i18nKeyTitle': 'asset_issuance',
                    'iconHTML': '<i class="far fa-coin"></i>'
                },
                1: {
                    'title': "Asset Transfer",
                    'i18nKeyTitle': 'asset_transfer',
                    'iconHTML': '<i class="ion-arrow-swap"></i>',
                    'receiverPage': "transfer_history"
                },
                2: {
                    'title': "Ask Order Placement",
                    'i18nKeyTitle': 'ask_order_placement',
                    'iconHTML': '<i class="far fa-comments"></i>',
                    'receiverPage': "open_orders"
                },
                3: {
                    'title': "Bid Order Placement",
                    'i18nKeyTitle': 'bid_order_placement',
                    'iconHTML': '<i class="far fa-comment-alt-dots"></i>',
                    'receiverPage': "open_orders"
                },
                4: {
                    'title': "Ask Order Cancellation",
                    'i18nKeyTitle': 'ask_order_cancellation',
                    'iconHTML': '<i class="far fa-times"></i>',
                    'receiverPage': "open_orders"
                },
                5: {
                    'title': "Bid Order Cancellation",
                    'i18nKeyTitle': 'bid_order_cancellation',
                    'iconHTML': '<i class="far fa-times"></i>',
                    'receiverPage': "open_orders"
                },
                6: {
                    'title': "Dividend Payment",
                    'i18nKeyTitle': 'dividend_payment',
                    'iconHTML': '<i class="far fa-hand-receiving"></i>',
                    'receiverPage': "transactions"
                },
                7: {
                    'title': "Delete Asset Shares",
                    'i18nKeyTitle': 'delete_asset_shares',
                    'iconHTML': '<i class="far fa-remove-format"></i>',
                    'receiverPage': "transactions"
                },
                8: {
                    'title': "Increase Asset Shares",
                    'i18nKeyTitle': 'increase_asset_shares',
                    'iconHTML': '<i class="far fa-arrow-alt-up"></i>',
                    'receiverPage': "transactions"
                },
                9: {
                    'title': "Asset Control",
                    'i18nKeyTitle': 'asset_control',
                    'iconHTML': '<i class="far fa-lock"></i>',
                    'receiverPage': "transactions"
                },
                10: {
                    'title': "Set Asset Property",
                    'i18nKeyTitle': 'set_asset_property',
                    'iconHTML': '<i class="far fa-pencil"></i>',
                    'receiverPage': "transactions"
                },
                11: {
                    'title': "Delete Asset Property",
                    'i18nKeyTitle': 'delete_asset_property',
                    'iconHTML': '<i class="far fa-eraser"></i>',
                    'receiverPage': "transactions"
                }
            }
        },
        3: {
            'title': "mStore",
            'i18nKeyTitle': 'mstore',
            'iconHTML': '<i class="far fa-bags-shopping"></i>',
            'chainType': "beta",
            'subTypes': {
                0: {
                    'title': "mStore Listing",
                    'i18nKeyTitle': 'mstore_listing',
                    'iconHTML': '<i class="far fa-store-alt"></i>'
                },
                1: {
                    'title': "mStore Removal",
                    'i18nKeyTitle': 'mstore_removal',
                    'iconHTML': '<i class="far fa-times"></i>'
                },
                2: {
                    'title': "mStore Price Change",
                    'i18nKeyTitle': 'mstore_price_change',
                    'iconHTML': '<i class="far fa-line-chart"></i>'
                },
                3: {
                    'title': "mStore Quantity Change",
                    'i18nKeyTitle': 'mstore_quantity_change',
                    'iconHTML': '<i class="far fa-line-height"></i>'
                },
                4: {
                    'title': "mStore Purchase",
                    'i18nKeyTitle': 'mstore_purchase',
                    'iconHTML': '<i class="far fa-money-bill-alt"></i>',
                    'receiverPage': "pending_orders_dgs"
                },
                5: {
                    'title': "mStore Delivery",
                    'i18nKeyTitle': 'mstore_delivery',
                    'iconHTML': '<i class="far fa-truck"></i>',
                    'receiverPage': "purchased_dgs"
                },
                6: {
                    'title': "mStore Feedback",
                    'i18nKeyTitle': 'mstore_feedback',
                    'iconHTML': '<i class="ion-android-social"></i>',
                    'receiverPage': "completed_orders_dgs"
                },
                7: {
                    'title': "mStore Refund",
                    'i18nKeyTitle': 'mstore_refund',
                    'iconHTML': '<i class="far fa-send-back"></i>',
                    'receiverPage': "purchased_dgs"
                }
            }
        },
        4: {
            'title': "Account Control",
            'i18nKeyTitle': 'account_control',
            'iconHTML': '<i class="ion-locked"></i>',
            'chainType': "beta",
            'subTypes': {
                0: {
                    'title': "Mandatory Approval",
                    'i18nKeyTitle': 'phasing_only',
                    'iconHTML': '<i class="far fa-file-signature"></i>',
                    'receiverPage': "transactions"
                }
            }
        },
        5: {
            'title': "Mutapa Bank",
            'i18nKeyTitle': 'mutapa_bank',
            'iconHTML': '<i class="fa fa-university"></i>',
            'chainType': "beta",
            'subTypes': {
                0: {
                    'title': "Issue Currency",
                    'i18nKeyTitle': 'issue_currency',
                    'iconHTML': '<i class="far fa-envelope-open-dollar"></i>'
                },
                1: {
                    'title': "Reserve Increase",
                    'i18nKeyTitle': 'reserve_increase',
                    'iconHTML': '<i class="far fa-badge-dollar"></i>'
                },
                2: {
                    'title': "Reserve Claim",
                    'i18nKeyTitle': 'reserve_claim',
                    'iconHTML': '<i class="far fa-lightbulb-dollar"></i>',
                    'receiverPage': "currencies"
                },
                3: {
                    'title': "Currency Transfer",
                    'i18nKeyTitle': 'currency_transfer',
                    'iconHTML': '<i class="ion-arrow-swap"></i>',
                    'receiverPage': "currencies"
                },
                4: {
                    'title': "Publish Exchange Offer",
                    'i18nKeyTitle': 'publish_exchange_offer',
                    'iconHTML': '<i class="far fa-list-alt "></i>'
                },
                5: {
                    'title': "Buy Currency",
                    'i18nKeyTitle': 'currency_buy',
                    'iconHTML': '<i class="far fa-usd-circle"></i>',
                    'receiverPage': "currencies"
                },
                6: {
                    'title': "Sell Currency",
                    'i18nKeyTitle': 'currency_sell',
                    'iconHTML': '<i class="far fa-usd-square"></i>',
                    'receiverPage': "currencies"
                },
                7: {
                    'title': "Mint Currency",
                    'i18nKeyTitle': 'mint_currency',
                    'iconHTML': '<i class="far fa-box-usd"></i>',
                    'receiverPage': "currencies"
                },
                8: {
                    'title': "Delete Currency",
                    'i18nKeyTitle': 'delete_currency',
                    'iconHTML': '<i class="far fa-times"></i>'
                }
            }
        },
        6: {
            'title': "microCloud",
            'i18nKeyTitle': 'tagged_data',
            'iconHTML': '<i class="fa fa-cloud"></i>',
            'chainType': "beta",
            'subTypes': {
                0: {
                    'title': "Upload Data",
                    'i18nKeyTitle': 'upload_tagged_data',
                    'iconHTML': '<i class="far fa-cloud-upload"></i>'
                }
            }
        },
        7: {
            'title': "Shuffling",
            'i18nKeyTitle': 'shuffling',
            'iconHTML': '<i class="far fa-shredder"></i>',
            'chainType': "beta",
            'subTypes': {
                0: {
                    'title': "Shuffling Creation",
                    'i18nKeyTitle': 'shuffling_creation',
                    'iconHTML': '<i class="far fa-random"></i>'
                },
                1: {
                    'title': "Shuffling Registration",
                    'i18nKeyTitle': 'shuffling_registration',
                    'iconHTML': '<i class="far fa-file-export"></i>'
                },
                2: {
                    'title': "Shuffling Processing",
                    'i18nKeyTitle': 'shuffling_processing',
                    'iconHTML': '<i class="far fa-server"></i>'
                },
                3: {
                    'title': "Shuffling Recipients",
                    'i18nKeyTitle': 'shuffling_recipients',
                    'iconHTML': '<i class="far fa-user-plus"></i>'
                },
                4: {
                    'title': "Shuffling Verification",
                    'i18nKeyTitle': 'shuffling_verification',
                    'iconHTML': '<i class="far fa-check-square"></i>'
                },
                5: {
                    'title': "Shuffling Cancellation",
                    'i18nKeyTitle': 'shuffling_cancellation',
                    'iconHTML': '<i class="far fa-thumbs-down"></i>'
                }
            }
        },
        8: {
            'title': "Aliases",
            'i18nKeyTitle': 'aliases',
            'iconHTML': "<i class='fa fa-user'></i>",
            'chainType': "beta",
            'subTypes': {
                0: {
                    'title': "Alias Assignment",
                    'i18nKeyTitle': 'alias_assignment',
                    'iconHTML': "<i class='fa fa-bookmark'></i>"
                },
                1: {
                    'title': "Alias Sale/Transfer",
                    'i18nKeyTitle': 'alias_sale_transfer',
                    'iconHTML': "<i class='far fa-tag'></i>",
                    'receiverPage': "aliases"
                },
                2: {
                    'title': "Alias Buy",
                    'i18nKeyTitle': 'alias_buy',
                    'iconHTML': "<i class='far fa-money-bill-alt'></i>",
                    'receiverPage': "aliases"
                },
                3: {
                    'title': "Alias Deletion",
                    'i18nKeyTitle': 'alias_deletion',
                    'iconHTML': "<i class='far fa-times'></i>"
                }
            }
        },
        9: {
            'title': "Voting",
            'i18nKeyTitle': 'voting',
            'iconHTML': "<i class='far fa-box-ballot'></i>",
            'chainType': "beta",
            'subTypes': {
                0: {
                    'title': "Poll Creation",
                    'i18nKeyTitle': 'poll_creation',
                    'iconHTML': "<i class='far fa-ballot'></i>"
                },
                1: {
                    'title': "Vote Casting",
                    'i18nKeyTitle': 'vote_casting',
                    'iconHTML': "<i class='far fa-ballot-check'></i>"
                },
                2: {
                    'title': "Transaction Approval",
                    'i18nKeyTitle': 'transaction_approval',
                    'iconHTML': "<i class='far fa-gavel'></i>",
                    'receiverPage': "transactions"
                }
            }
        },
        10: {
            'title': "Account Properties",
            'i18nKeyTitle': 'account_properties',
            'iconHTML': "<i class='fa fa-sticky-note'></i>",
            'chainType': "beta",
            'subTypes': {
                0: {
                    'title': "Account Info",
                    'i18nKeyTitle': 'account_info',
                    'iconHTML': "<i class='far fa-info'></i>"
                },
                1: {
                    'title': "Account Property",
                    'i18nKeyTitle': 'account_property',
                    'iconHTML': "<i class='far fa-pencil'></i>",
                    'receiverPage': "transactions"
                },
                2: {
                    'title': "AccountPropertyDelete",
                    'i18nKeyTitle': 'account_property_delete',
                    'iconHTML': "<i class='far fa-eraser'></i>",
                    'receiverPage': "transactions"
                }
            }
        },
        11: {
            'title': "Coin Exchange",
            'i18nKeyTitle': 'coin_exchange',
            'iconHTML': "<i class='far fa-exchange-alt'></i>",
            'chainType': "beta",
            'subTypes': {
                0: {
                    'title': "Issue Order",
                    'i18nKeyTitle': 'issue_order',
                    'iconHTML': "<i class='far fa-comment-alt-dollar'></i>",
                    'receiverPage': 'open_coin_orders'
                },
                1: {
                    'title': "Cancel Order",
                    'i18nKeyTitle': 'cancel_order',
                    'iconHTML': "<i class='far fa-times'></i>",
                    'receiverPage': 'open_coin_orders'
                    }
                }
            },
            12: {
                'title': "Contract Reference",
                'i18nKeyTitle': 'contract_reference',
                'iconHTML': "<i class='fa fa-file-contract'></i>",
                'chainType': "beta",
                'subTypes': {
                    0: {
                        'title': "Set Contract Reference",
                        'i18nKeyTitle': 'set_contract_reference',
                        'iconHTML': "<i class='far fa-file-csv'></i>",
                        'receiverPage': "transactions"
                    },
                    1: {
                        'title': "Delete Contract Reference",
                        'i18nKeyTitle': 'delete_contract_reference',
                        'iconHTML': "<i class='far fa-eraser'></i>",
                        'receiverPage': "transactions"
                    }
                }
            },
            13: {
                'title': "Permissions Control",
                'i18nKeyTitle': 'permissions_control',
                'iconHTML': "<i class='fa fa-users-cog'></i>",
                'chainType': "beta",
                'subTypes': {
                    0: {
                        'title': "Grant Permission",
                        'i18nKeyTitle': 'grant_permission',
                        'iconHTML': "<i class='fa fa-unlock'></i>",
                        'receiverPage': "permissions_control"
                    },
                    1: {
                        'title': "Remove Permission",
                        'i18nKeyTitle': 'remove_permission',
                        'iconHTML': "<i class='fa fa-user-times'></i>",
                        'receiverPage': "permissions_control"
                    }
                }
            }

        };

        NRS.subtype = {};

        NRS.loadTransactionTypeConstants = function (response) {
            for (const typeIndex in response.transactionTypes) {
                if (!response.transactionTypes.hasOwnProperty(typeIndex)) {
                    continue;
                }
                if (!(typeIndex in NRS.transactionTypes)) {
                    NRS.transactionTypes[typeIndex] = {
                        'title': "Unknown",
                        'i18nKeyTitle': 'unknown',
                        'iconHTML': '<i class="far fa-question-circle"></i>',
                        'subTypes': {}
                    }
                }
                let type = response.transactionTypes[typeIndex];
                for (const subTypeIndex in type.subtypes) {
                    if (!type.subtypes.hasOwnProperty(subTypeIndex)) {
                        continue;
                    }
                    if (!(subTypeIndex in NRS.transactionTypes[typeIndex]["subTypes"])) {
                        NRS.transactionTypes[typeIndex]["subTypes"][subTypeIndex] = {
                            'title': "Unknown",
                            'i18nKeyTitle': 'unknown',
                            'iconHTML': '<i class="far fa-question-circle"></i>'
                        }
                    }
                    NRS.transactionTypes[typeIndex]["subTypes"][subTypeIndex]["serverConstants"] = type.subtypes[subTypeIndex];
                }
            }
            NRS.subtype = response.transactionSubTypes;
        };

        NRS.isOfType = function (transaction, typeStr) {
            if (!NRS.subtype[typeStr]) {
                var msg = $.t("unsupported_transaction_type", {type: typeStr});
                $.growl(msg);
                NRS.logConsole(msg);
                return false;
            }
            return transaction.type == NRS.subtype[typeStr].type && transaction.subtype == NRS.subtype[typeStr].subtype;
        };

        NRS.notOfType = function (transaction, typeStr) {
            return !NRS.isOfType(transaction, typeStr);
        };

        return NRS;
    }(isNode ? client : NRS || {}, jQuery));

    if (isNode) {
        module.exports = NRS;
    }
});