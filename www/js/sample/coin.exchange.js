/******************************************************************************
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

var loader = require("./loader");
var config = loader.config;

loader.load(function(NRS) {
    const decimals = 8;
    var quantity = 2.5;
    var price = 1.3;
    var data = {
        exchange: "1",
        quantityQNT: NRS.convertToQNT(quantity, decimals),
        priceMTAPerCoin: NRS.convertToMTA(price),
        secretPhrase: config.secretPhrase,
        chain: config.chain,
		isParentChainTransaction: 1
    };
    data = Object.assign(
        data,
        NRS.getMandatoryParams()
    );
    NRS.sendRequest("exchangeCoins", data, function (response) {
        NRS.logConsole(JSON.stringify(response));
    });
});
