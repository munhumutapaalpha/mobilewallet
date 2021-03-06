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

jQuery.t = function(text) {
    return text;
};

QUnit.module("nrs.util");

QUnit.test("convertToNXT", function (assert) {
    assert.equal(NRS.convertToNXT(200000000), "2", "whole");
    assert.equal(NRS.convertToNXT(20000000), "0.2", "fraction");
    assert.equal(NRS.convertToNXT(-200000000), "-2", "negative");
    assert.equal(NRS.convertToNXT(-20000000), "-0.2", "fraction.negative");
    assert.equal(NRS.convertToNXT(-220000000), "-2.2", "whole.fraction.negative");
    assert.equal(NRS.convertToNXT(2), "0.00000002", "mta");
    assert.equal(NRS.convertToNXT(-2), "-0.00000002", "mta.negative");
    assert.equal(NRS.convertToNXT(new BigInteger(String(2))), "0.00000002", "input.object");
    assert.equal(NRS.convertToNXT("hi"), "0.00000188", "alphanumeric"); // strange behavior of BigInteger don't do that
    assert.throws(function () {
        NRS.convertToNXT(null);
    }, {
        "message": "Cannot read property 'compareTo' of null",
        "name": "TypeError"
    }, "null.value");
});

QUnit.test("intToFloat", function (assert) {
    assert.equal(NRS.intToFloat(200, 2), "2", "whole");
    assert.equal(NRS.intToFloat(200, 4), "0.02", "four.decimals");
    assert.equal(NRS.intToFloat(20, 2), "0.2", "fraction");
    assert.equal(NRS.intToFloat(-200, 2), "-2", "negative");
    assert.equal(NRS.intToFloat(-20, 2), "-0.2", "fraction.negative");
    assert.equal(NRS.intToFloat(-220, 2), "-2.2", "whole.fraction.negative");
    assert.equal(NRS.intToFloat(2, 2), "0.02", "mta");
    assert.equal(NRS.intToFloat(-2, 2), "-0.02", "mta.negative");
    assert.equal(NRS.intToFloat(new BigInteger(String(2)), 2), "0.02", "input.object");
});

QUnit.test("format", function (assert) {
    assert.equal(NRS.format("12345"), Number("12345").toLocaleString('en-US'), "escaped");
    assert.equal(NRS.format("12345", true), Number(12345).toLocaleString('en-US'), "not.escaped");
    assert.equal(NRS.format("-12345", false), Number(-12345).toLocaleString('en-US'), "neg");
    assert.equal(NRS.format("-12345", true), Number("-12345").toLocaleString('en-US'), "neg.not.escaped");
    assert.equal(NRS.format("-12345.67", true), Number("-12345.67").toLocaleString('en-US'), "decimal.not.good"); // bug ?
    assert.equal(NRS.format({ amount: 1234, negative: '-', mantissa: ".567"}, true), Number(-1234.567).toLocaleString('en-US'), "object");
    assert.equal(NRS.format("12.34", false, 4), "12.3400", "zero.pad");
    assert.equal(NRS.format("12", false, 4), "12.0000", "zero.pad.whole");
    assert.equal(NRS.format("12.", false, 4), "12.0000", "zero.pad.whole");
    assert.equal(NRS.format("12.34567", false, 4), "12.34567", "zero.pad.not.necessary");
    assert.equal(NRS.format("12", false, 0), "12", "zero.to.pad");
});

QUnit.test("formatAmount", function (assert) {
    assert.equal(NRS.formatAmount("12345", false, false), "0.00012345", "mta");
    assert.equal(NRS.formatAmount("12345", true, false), "0.00012345", "mta.rounding");
    assert.equal(NRS.formatAmount("1234500000", false, false), "12.345", "string");
    assert.equal(NRS.formatAmount("1234500000", true, false), "12.345", "string.no.rounding");
    assert.equal(NRS.formatAmount(12.345, false, false), "12.345", "number");
    assert.equal(NRS.formatAmount(12.345, true, false), "12.35", "number.rounding");
    assert.equal(NRS.formatAmount(12.343, true, false), "12.34", "number.rounding");
    assert.equal(NRS.formatAmount("123456700000", false, true), Number("1234.567").toLocaleString('en-US'), "1000separator");
    assert.equal(NRS.formatAmount("123456700000000", true, true), Number("1234567").toLocaleString('en-US'), "nxt.rounding");
    assert.equal(NRS.formatAmount("123456780000000", true, false), Number("1234567.8").toLocaleString('en-US'), "thousands.separator.escaped");
});

QUnit.test("formatVolume", function (assert) {
    assert.equal(NRS.formatVolume(1), "1 B", "byte");
    assert.equal(NRS.formatVolume(1000), "1'000 B", "thousand");
    assert.equal(NRS.formatVolume(1024), "1 KB", "kilo");
    assert.equal(NRS.formatVolume(1000000), "977 KB", "million");
    assert.equal(NRS.formatVolume(1024 * 1024), "1 MB", "million");
    assert.equal(NRS.formatVolume(2 * 1024 * 1024 + 3 * 1024 + 4), "2 MB", "combination");
});

QUnit.test("formatWeight", function (assert) {
    assert.equal(NRS.formatWeight(1), "1", "byte");
    assert.equal(NRS.formatWeight(1000), "1&#39;000", "thousand");
    assert.equal(NRS.formatWeight(12345), "12&#39;345", "number");
});

QUnit.test("calculateOrderTotalMTA", function (assert) {
    assert.equal(NRS.multiply(12, 34), "408", "multiplication");
});

QUnit.test("calculatePercentage", function (assert) {
    assert.equal(NRS.calculatePercentage(6, 15), "40.00", "pct1");
    assert.equal(NRS.calculatePercentage(5, 15), "33.33", "pct1");
    assert.equal(NRS.calculatePercentage(10, 15), "66.67", "pct3");
    assert.equal(NRS.calculatePercentage(10, 15, 0), "66.66", "pct3.round0");
    assert.equal(NRS.calculatePercentage(10, 15, 1), "66.67", "pct3.round1");
    assert.equal(NRS.calculatePercentage(10, 15, 2), "66.67", "pct3.round2");
    assert.equal(NRS.calculatePercentage(10, 15, 3), "66.67", "pct3.round3");
});

QUnit.test("amountToPrecision", function (assert) {
    assert.equal(NRS.amountToPrecision(12, 0), "12", "multiplication");
    assert.equal(NRS.amountToPrecision(12., 0), "12", "multiplication");
    assert.equal(NRS.amountToPrecision(12.0, 0), "12", "multiplication");
    assert.equal(NRS.amountToPrecision(12.345600, 4), "12.3456", "multiplication");
    assert.equal(NRS.amountToPrecision(12.3456, 4), "12.3456", "multiplication");
    assert.equal(NRS.amountToPrecision(12.3456, 3), "12.345", "multiplication");
    assert.equal(NRS.amountToPrecision(12.3456, 2), "12.34", "multiplication");
    assert.equal(NRS.amountToPrecision(12.3006, 2), "12.30", "multiplication");
    assert.equal(NRS.amountToPrecision("12", 0), "12", "multiplication");
    assert.equal(NRS.amountToPrecision("12.", 0), "12", "multiplication");
    assert.equal(NRS.amountToPrecision("12.0", 0), "12", "multiplication");
    assert.equal(NRS.amountToPrecision("12.345600", 4), "12.3456", "multiplication");
    assert.equal(NRS.amountToPrecision("12.3456", 4), "12.3456", "multiplication");
    assert.equal(NRS.amountToPrecision("12.3456", 3), "12.345", "multiplication");
    assert.equal(NRS.amountToPrecision("12.3456", 2), "12.34", "multiplication");
    assert.equal(NRS.amountToPrecision("12.3006", 2), "12.30", "multiplication");
});

QUnit.test("convertToMTA", function (assert) {
    assert.equal(NRS.convertToMTA(1), "100000000", "one");
    assert.equal(NRS.convertToMTA(1.), "100000000", "one.dot");
    assert.equal(NRS.convertToMTA(1.0), "100000000", "one.dot.zero");
    assert.equal(NRS.convertToMTA(.1), "10000000", "dot.one");
    assert.equal(NRS.convertToMTA(0.1), "10000000", "zero.dot.one");
    assert.equal(NRS.convertToMTA("0.00000001"), "1", "mta");
    assert.throws(function () {
        NRS.convertToMTA(0.00000001); // since it's passed as 1e-8
    }, err => err === "Invalid input: currency 1e-8 decimals 8", "invalid.input");
});

QUnit.test("floatToInt", function (assert) {
    assert.equal(NRS.floatToInt(1, 2), "100", "one");
    assert.equal(NRS.floatToInt(1., 2), "100", "one.dot");
    assert.equal(NRS.floatToInt(1.0, 2), "100", "one.dot.zero");
    assert.equal(NRS.floatToInt(.1, 2), "10", "dot.one");
    assert.equal(NRS.floatToInt(0.1, 2), "10", "zero.dot.one");
    assert.equal(NRS.floatToInt("0.01", 2), "1", "mta");
});

QUnit.test("convertToQNTf", function (assert) {
    assert.equal(NRS.convertToQNTf(1, 0), "1", "one");
    assert.equal(NRS.convertToQNTf(1, 3), "0.001", "milli");
    assert.equal(NRS.convertToQNTf(1000, 3), "1", "three.decimals");
    assert.equal(NRS.convertToQNTf(1234567, 3), "1234.567", "multi");
    assert.deepEqual(NRS.convertToQNTf(1234567, 3, true), {amount: "1234", mantissa: ".567"}, "object");
});

QUnit.test("convertToQNT", function (assert) {
    assert.equal(NRS.convertToQNT(1, 0), "1", "one");
    assert.equal(NRS.convertToQNT(1, 3), "1000", "thousand");
    assert.equal(NRS.convertToQNT(1000, 3), "1000000", "million");
    assert.equal(NRS.convertToQNT(1.234, 3), "1234", "multi");
    assert.equal(NRS.convertToQNT(0.1234, 4), "1234", "decimal");
    assert.throws(function () { NRS.convertToQNT(0.12345, 4) },
        err => err === "Fraction can only have 4 decimals max.", "too.many.decimals");
});

QUnit.test("formatQuantity", function (assert) {
    assert.equal(NRS.formatQuantity(1, 0), "1", "one");
    assert.equal(NRS.formatQuantity(10000000, 3, true), Number("10000").toLocaleString('en-US'), "thousand");
    assert.equal(NRS.formatQuantity(1234, 2, true), Number("12.34").toLocaleString('en-US'), "thousand");
    assert.equal(NRS.formatQuantity(123456, 2, true), Number("1234.56").toLocaleString('en-US'), "thousand");
    assert.equal(NRS.formatQuantity(1234567, 2, true), Number("12345.67").toLocaleString('en-US'), "thousand");
    assert.equal(NRS.formatQuantity("1234567890123456", 16, true), Number("0.12345678").toFixed(8).toLocaleString('en-US'), "cut.to.chain.precision");
    assert.equal(NRS.formatQuantity("12345678901234567", 16, true), Number("1.23456789").toFixed(8).toLocaleString('en-US'), "cut.to.chain.precision");
    assert.equal(NRS.formatQuantity("123400000", 8, true, 8), Number("1.23400000").toFixed(8).toLocaleString('en-US'), "zero.pad");
    assert.equal(NRS.formatQuantity("100000000", 8, true, 8), Number("1.00000000").toFixed(8).toLocaleString('en-US'), "zero.pad");
    assert.equal(NRS.formatQuantity("123400000", 8, true, 80), Number("1.23400000").toFixed(8).toLocaleString('en-US'), "zero.pad.larger.than.chain.decimals");
    assert.equal(NRS.formatQuantity("123400000", 8, true, 3), Number("1.234").toLocaleString('en-US'), "zero.pad.no.effect");
});

QUnit.test("formatAmount", function (assert) {
    assert.equal(NRS.formatAmount(1), "1", "one");
    assert.equal(NRS.formatAmount(10000000, false, true), Number("10000000").toLocaleString('en-US'), "million");
    assert.equal(NRS.formatAmount(12.34, true), Number("12.34").toLocaleString('en-US'), "thousand");
    assert.equal(NRS.formatAmount(12.345, true), Number("12.35").toLocaleString('en-US'), "thousand");
});

QUnit.test("formatTimestamp", function (assert) {
    assert.equal(NRS.formatTimestamp(0, true, true), "1/1/1970", "start.date");
});

QUnit.test("getAccountLink", function (assert) {
    function normalize(linkString) {
        return linkString.replace(/\s\s+/g, ' ');
    }
    assert.equal(NRS.getAccountLink({}, "dummy"), "/", "non.existing");
    assert.equal(normalize(NRS.getAccountLink({entity: 5873880488492319831}, "entity")), "<a href='#' data-user='MUNHU-XKA2-7VJU-VZSY-7R335' class='show_account_modal_action user-info'> <span class='regular-view'>/</span> <span class='mobile-view' style='display: none' title='/'>/</span> </a>", "numeric");
    assert.equal(normalize(NRS.getAccountLink({entityRS: "NXT-XK4R-7VJU-6EQG-7R335"}, "entity")), "<a href='#' data-user='NXT-XK4R-7VJU-6EQG-7R335' class='show_account_modal_action user-info'> <span class='regular-view'>NXT-XK4R-7VJU-6EQG-7R335</span> <span class='mobile-view' style='display: none' title='NXT-XK4R-7VJU-6EQG-7R335'>...7R335</span> </a>", "RS");
    assert.equal(normalize(NRS.getAccountLink({ entity: 5873880488492319831, entityRS: "NXT-XK4R-7VJU-6EQG-7R335" }, "entity")), "<a href='#' data-user='NXT-XK4R-7VJU-6EQG-7R335' class='show_account_modal_action user-info'> <span class='regular-view'>NXT-XK4R-7VJU-6EQG-7R335</span> <span class='mobile-view' style='display: none' title='NXT-XK4R-7VJU-6EQG-7R335'>...7R335</span> </a>", "numeric.and.RS");
    NRS.contacts = {"NXT-XK4R-7VJU-6EQG-7R335": {name: "foo"}};
    assert.equal(normalize(NRS.getAccountLink({entityRS: "NXT-XK4R-7VJU-6EQG-7R335"}, "entity")), "<a href='#' data-user='NXT-XK4R-7VJU-6EQG-7R335' class='show_account_modal_action user-info'> <span class='regular-view'>foo</span> <span class='mobile-view' style='display: none' title='foo'>foo</span> </a>", "contact");
    NRS.accountRS = "NXT-XK4R-7VJU-6EQG-7R335";
    assert.equal(normalize(NRS.getAccountLink({entityRS: "NXT-XK4R-7VJU-6EQG-7R335"}, "entity")), "<a href='#' data-user='NXT-XK4R-7VJU-6EQG-7R335' class='show_account_modal_action user-info'> <span class='regular-view'>You</span> <span class='mobile-view' style='display: none' title='You'>You</span> </a>", "you");
    assert.equal(normalize(NRS.getAccountLink({entityRS: "NXT-XK4R-7VJU-6EQG-7R335"}, "entity", "NXT-XK4R-7VJU-6EQG-7R335", "account")), "<a href='#' data-user='NXT-XK4R-7VJU-6EQG-7R335' class='show_account_modal_action user-info'> <span class='regular-view'>Account</span> <span class='mobile-view' style='display: none' title='Account'>...count</span> </a>", "force.account.name");
    assert.equal(normalize(NRS.getAccountLink({entityRS: "NXT-XK4R-7VJU-6EQG-7R335"}, "entity", undefined, undefined, true)), "<a href='#' data-user='NXT-XK4R-7VJU-6EQG-7R335' class='show_account_modal_action user-info'> <span class='regular-view'>NXT-XK4R-7VJU-6EQG-7R335</span> <span class='mobile-view' style='display: none' title='NXT-XK4R-7VJU-6EQG-7R335'>...7R335</span> </a>", "maintain.rs.format");
    assert.equal(normalize(NRS.getAccountLink({entityRS: "NXT-XK4R-7VJU-6EQG-7R335"}, "entity", undefined, undefined, undefined, "btn btn-xs")), "<a href='#' data-user='NXT-XK4R-7VJU-6EQG-7R335' class='show_account_modal_action user-info btn btn-xs'> <span class='regular-view'>You</span> <span class='mobile-view' style='display: none' title='You'>You</span> </a>", "add.class");
    assert.equal(normalize(NRS.getAccountLink({entityRS: "NXT-XK4R-7VJU-6EQG-7R335"}, "entity", undefined, undefined, undefined, undefined, "alert(1)")), "<a href='#' onclick='alert(1)' data-user='NXT-XK4R-7VJU-6EQG-7R335' class='show_account_modal_action user-info'> <span class='regular-view'>You</span> <span class='mobile-view' style='display: none' title='You'>You</span> </a>", "onclick handler");
    NRS.contacts = null;
    NRS.accountRS = null;
});

QUnit.test("generateToken", function (assert) {
    NRS.generateToken("myToken", NRS.getPrivateKey("rshw9abtpsa2"), function (token) {
        assert.ok(token.indexOf("e9cl0jgba7lnp7gke9rdp7hg3uvcl5cnd23") == 0);
        assert.equal(token.length, 160);
    });
    assert.ok(true);
});

QUnit.test("utf8", function (assert) {
    // compare the two UTF8 conversion methods
    var str = "Hello World";
    var bytes1 = NRS.getUtf8Bytes(str);
    var bytes2 = NRS.strToUTF8Arr(str);
    assert.deepEqual(bytes1, bytes2);
    // Hebrew
    str = "אבג";
    bytes1 = NRS.getUtf8Bytes(str);
    bytes2 = NRS.strToUTF8Arr(str);
    assert.deepEqual(bytes1, bytes2);
    // Chinese Simplified
    str = "简体中文网页";
    bytes1 = NRS.getUtf8Bytes(str);
    bytes2 = NRS.strToUTF8Arr(str);
    assert.deepEqual(bytes1, bytes2);
    // Chinese Traditional
    str = "繁體中文網頁";
    bytes1 = NRS.getUtf8Bytes(str);
    bytes2 = NRS.strToUTF8Arr(str);
    assert.deepEqual(bytes1, bytes2);
});

QUnit.test("versionCompare", function (assert) {
    assert.equal(NRS.versionCompare("1.6.4", "1.7.5"), "-1", "after");
    assert.equal(NRS.versionCompare("1.7.5", "1.6.4"), "1", "before");
    assert.equal(NRS.versionCompare("1.6.4", "1.6.4"), "0", "same");
    assert.equal(NRS.versionCompare("1.6.4e", "1.6.5e"), "-1", "after.e");
    assert.equal(NRS.versionCompare("1.6.5e", "1.6.4e"), "1", "before.e");
    assert.equal(NRS.versionCompare("1.6.4e", "1.6.4e"), "0", "same.e");
    assert.equal(NRS.versionCompare("1.7.5", "1.8.0e"), "-1", "after.ga.vs.e");
    assert.equal(NRS.versionCompare("1.7.5e", "1.8.0"), "-1", "after.e.vs.ga");
    assert.equal(NRS.versionCompare("1.8.0e", "1.8.0"), "1", "same.e.before.ga");
});

QUnit.test("numberOfDecimals", function (assert) {
    var rows = [{price: "1.23"}, {price: "1.234"}];
    assert.equal(NRS.getNumberOfDecimals(rows, "price"), 3, "no.callback");
    rows = [{price: "123000000"}, {price: "123400000"}];
    assert.equal(NRS.getNumberOfDecimals(rows, "price", function (val) {
        return NRS.formatAmount(val.price);
    }), 3, "with.callback");
});

QUnit.test("accountMatching", function (assert) {
    var regex = NRS.getRsAccountRegex();
    assert.equal(NRS.isRsAccountImpl("NXT-XK4R-7VJU-6EQG-7R335", regex), true, "valid.account");
    assert.equal(NRS.isRsAccountImpl("COAL-XK4R-7VJU-6EQG-7R335", regex), true, "also.valid.account.different.prefix");
    assert.equal(NRS.isRsAccountImpl("Nxt-xk4r-7VJU-6EQG-7R335", regex), true, "not.case.sensitive");
    assert.equal(NRS.isRsAccountImpl("NXT-XK4R-7VJU-6EQG-7R336", regex), true, "nor.rs.valid.still.valid");
    assert.equal(NRS.isRsAccountImpl("5873880488492319831", regex), false, "numeric.no.match");
    assert.equal(NRS.isRsAccountImpl("NXT-____-____-____-_____", regex), true, "underscore_mask_again");
    regex = NRS.getNumericAccountRegex();
    assert.equal(NRS.isNumericAccountImpl("NXT-XK4R-7VJU-6EQG-7R335", regex), false, "non.numeric.no.match");
    assert.equal(NRS.isNumericAccountImpl("5873880488492319831", regex), true, "numeric.match");
});

QUnit.test("escaping", function (assert) {
    var response = {"minimumFeeFQT":"1000000","transactionJSON":{"senderPublicKey":"584486d2ba4dbd7eaeadd071f9f8c3593cee620e1e374033551147d68899b529","chain":2,"feeMTA":"500000","type":1,"version":1,"fxtTransaction":"0","phased":false,"ecBlockId":"7136116332013816990","attachment":{"version.PrunablePlainMessage":1,"messageIsText":true,"messageHash":"be3eea9a483308cb3134ce068e77b56e7c25af19480742880179827cb3c9b5c0","message":"'","version.ArbitraryMessage":0},"senderRS":"MUNHU-V4D7-D3XW-JX9Z-EAC8K","subtype":0,"amountMTA":"0","sender":"14454664023893707109","recipientRS":"MUNHU-V4D7-D3XW-JX9Z-EAC8K","recipient":"14454664023893707109","ecBlockHeight":17000,"deadline":15,"timestamp":2488675,"height":2147483647},"unsignedTransactionBytes":"0200000001000163f925000f00584486d2ba4dbd7eaeadd071f9f8c3593cee620e1e374033551147d68899b5296589cd7b584899c8000000000000000020a107000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000684200009e0c8cc5fe930863080000000100be3eea9a483308cb3134ce068e77b56e7c25af19480742880179827cb3c9b5c0000000000000000000000000000000000000000000000000000000000000000000000000","broadcasted":false,"requestProcessingTime":2,"binderRateMTAPerFXT":"50000000"};
    NRS.escapeResponseObjStrings(response);
    assert.equal(response.transactionJSON.attachment.message, "&#39;", "escaped.message");

    response = {"minimumFeeFQT":"1000000","transactionJSON":{"senderPublicKey":"584486d2ba4dbd7eaeadd071f9f8c3593cee620e1e374033551147d68899b529","chain":2,"feeMTA":"500000","type":1,"version":1,"fxtTransaction":"0","phased":false,"ecBlockId":"7136116332013816990","attachment":{"version.PrunablePlainMessage":1,"messageIsText":true,"messageHash":"be3eea9a483308cb3134ce068e77b56e7c25af19480742880179827cb3c9b5c0","message":"'","version.ArbitraryMessage":0},"senderRS":"MUNHU-V4D7-D3XW-JX9Z-EAC8K","subtype":0,"amountMTA":"0","sender":"14454664023893707109","recipientRS":"MUNHU-V4D7-D3XW-JX9Z-EAC8K","recipient":"14454664023893707109","ecBlockHeight":17000,"deadline":15,"timestamp":2488675,"height":2147483647},"unsignedTransactionBytes":"0200000001000163f925000f00584486d2ba4dbd7eaeadd071f9f8c3593cee620e1e374033551147d68899b5296589cd7b584899c8000000000000000020a107000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000684200009e0c8cc5fe930863080000000100be3eea9a483308cb3134ce068e77b56e7c25af19480742880179827cb3c9b5c0000000000000000000000000000000000000000000000000000000000000000000000000","broadcasted":false,"requestProcessingTime":2,"binderRateMTAPerFXT":"50000000"};
    assert.equal(response.transactionJSON.attachment.message, "'", "exclude.message.from.escaping");
});

QUnit.test("pkcs7.padding", function (assert) {
    let cypherText = "LYLY";
    let paddedText = NRS.pkcs7Pad(new Uint8Array(converters.stringToByteArray(cypherText)));
    assert.equal(paddedText.length, 16);
    assert.equal(paddedText[paddedText.length - 1], 12);
    let unpaddedText = NRS.pkcs7Unpad(paddedText);
    assert.equal(converters.byteArrayToString([].slice.call(unpaddedText)), cypherText);

    cypherText = "012345678901234567890123456789"; // lenght 30
    paddedText = NRS.pkcs7Pad(new Uint8Array(converters.stringToByteArray(cypherText)));
    assert.equal(paddedText.length, 32);
    assert.equal(paddedText[paddedText.length - 1], 2);
    unpaddedText = NRS.pkcs7Unpad(paddedText);
    assert.equal(converters.byteArrayToString([].slice.call(unpaddedText)), cypherText);

    cypherText = "01234567890123456789012345678901"; // lenght 32
    paddedText = NRS.pkcs7Pad(new Uint8Array(converters.stringToByteArray(cypherText)));
    assert.equal(paddedText.length, 48);
    assert.equal(paddedText[paddedText.length - 1], 16);
    unpaddedText = NRS.pkcs7Unpad(paddedText);
    assert.equal(converters.byteArrayToString([].slice.call(unpaddedText)), cypherText);

    // Now let's try to cheat
    paddedText = new Uint8Array(converters.stringToByteArray("XXXXXXXXXXXXXX33")); // Should end with 3 "3" characters
    unpaddedText = NRS.pkcs7Unpad(paddedText);
    assert.equal(unpaddedText, null);

    // Now let's try to cheet
    paddedText = new Uint8Array(converters.stringToByteArray("0123456789012345")); // Text of length 16 does not end with 16 0x16 characters
    unpaddedText = NRS.pkcs7Unpad(paddedText);
    assert.equal(unpaddedText, null);
});

QUnit.test("oddHexStringLength", function (assert) {
    try {
        converters.hexStringToByteArray("12345");
    } catch (e) {
        assert.ok(true, e.message);
        return;
    }
    assert.notOk(true, "exception was expected");
});


