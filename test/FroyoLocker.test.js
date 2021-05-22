const { expectRevert } = require('@openzeppelin/test-helpers');
const { assert } = require("chai");
const FroyoLocker = artifacts.require('FroyoLocker');
const MockBEP20 = artifacts.require('libs/MockBEP20');


contract('FroyoLocker', ([alice, bob, carol, owner]) => {
    beforeEach(async () => {
        this.lp1 = await MockBEP20.new('LPToken', 'LP1', '1000000', { from: owner });
        this.froyoLocker = await FroyoLocker.new({ from: owner });
    });

    it('only owner', async () => {
        assert.equal((await this.froyoLocker.owner()), owner);

        // lock
        await this.lp1.transfer(this.froyoLocker.address, '2000', { from: owner });
        assert.equal((await this.lp1.balanceOf(this.froyoLocker.address)).toString(), '2000');

        await expectRevert(this.froyoLocker.unlock(this.lp1.address, bob, { from: bob }), 'Ownable: caller is not the owner');
        await this.froyoLocker.unlock(this.lp1.address, carol, { from: owner });
        assert.equal((await this.lp1.balanceOf(carol)).toString(), '2000');
        assert.equal((await this.lp1.balanceOf(this.froyoLocker.address)).toString(), '0');
    });
})
