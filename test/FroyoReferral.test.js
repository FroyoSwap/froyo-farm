const { expectRevert } = require('@openzeppelin/test-helpers');
const { assert } = require("chai");

const FroyoReferral = artifacts.require('FroyoReferral');

contract('FroyoReferral', ([alice, bob, carol, referrer, operator, owner]) => {
    beforeEach(async () => {
        this.froyoReferral = await FroyoReferral.new({ from: owner });
        this.zeroAddress = '0x0000000000000000000000000000000000000000';
    });

    it('should allow operator and only owner to update operator', async () => {
        assert.equal((await this.froyoReferral.operators(operator)).valueOf(), false);
        await expectRevert(this.froyoReferral.recordReferral(alice, referrer, { from: operator }), 'Operator: caller is not the operator');

        await expectRevert(this.froyoReferral.updateOperator(operator, true, { from: carol }), 'Ownable: caller is not the owner');
        await this.froyoReferral.updateOperator(operator, true, { from: owner });
        assert.equal((await this.froyoReferral.operators(operator)).valueOf(), true);

        await this.froyoReferral.updateOperator(operator, false, { from: owner });
        assert.equal((await this.froyoReferral.operators(operator)).valueOf(), false);
        await expectRevert(this.froyoReferral.recordReferral(alice, referrer, { from: operator }), 'Operator: caller is not the operator');
    });

    it('record referral', async () => {
        assert.equal((await this.froyoReferral.operators(operator)).valueOf(), false);
        await this.froyoReferral.updateOperator(operator, true, { from: owner });
        assert.equal((await this.froyoReferral.operators(operator)).valueOf(), true);

        await this.froyoReferral.recordReferral(this.zeroAddress, referrer, { from: operator });
        await this.froyoReferral.recordReferral(alice, this.zeroAddress, { from: operator });
        await this.froyoReferral.recordReferral(this.zeroAddress, this.zeroAddress, { from: operator });
        await this.froyoReferral.recordReferral(alice, alice, { from: operator });
        assert.equal((await this.froyoReferral.getReferrer(alice)).valueOf(), this.zeroAddress);
        assert.equal((await this.froyoReferral.referralsCount(referrer)).valueOf(), '0');

        await this.froyoReferral.recordReferral(alice, referrer, { from: operator });
        assert.equal((await this.froyoReferral.getReferrer(alice)).valueOf(), referrer);
        assert.equal((await this.froyoReferral.referralsCount(referrer)).valueOf(), '1');

        assert.equal((await this.froyoReferral.referralsCount(bob)).valueOf(), '0');
        await this.froyoReferral.recordReferral(alice, bob, { from: operator });
        assert.equal((await this.froyoReferral.referralsCount(bob)).valueOf(), '0');
        assert.equal((await this.froyoReferral.getReferrer(alice)).valueOf(), referrer);

        await this.froyoReferral.recordReferral(carol, referrer, { from: operator });
        assert.equal((await this.froyoReferral.getReferrer(carol)).valueOf(), referrer);
        assert.equal((await this.froyoReferral.referralsCount(referrer)).valueOf(), '2');
    });

    it('record referral commission', async () => {
        assert.equal((await this.froyoReferral.totalReferralCommissions(referrer)).valueOf(), '0');

        await expectRevert(this.froyoReferral.recordReferralCommission(referrer, 1, { from: operator }), 'Operator: caller is not the operator');
        await this.froyoReferral.updateOperator(operator, true, { from: owner });
        assert.equal((await this.froyoReferral.operators(operator)).valueOf(), true);

        await this.froyoReferral.recordReferralCommission(referrer, 1, { from: operator });
        assert.equal((await this.froyoReferral.totalReferralCommissions(referrer)).valueOf(), '1');

        await this.froyoReferral.recordReferralCommission(referrer, 0, { from: operator });
        assert.equal((await this.froyoReferral.totalReferralCommissions(referrer)).valueOf(), '1');

        await this.froyoReferral.recordReferralCommission(referrer, 111, { from: operator });
        assert.equal((await this.froyoReferral.totalReferralCommissions(referrer)).valueOf(), '112');

        await this.froyoReferral.recordReferralCommission(this.zeroAddress, 100, { from: operator });
        assert.equal((await this.froyoReferral.totalReferralCommissions(this.zeroAddress)).valueOf(), '0');
    });
});
