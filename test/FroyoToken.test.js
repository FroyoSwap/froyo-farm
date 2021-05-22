const { expectRevert } = require("@openzeppelin/test-helpers");
const { assert } = require("chai");

const FroyoToken = artifacts.require('FroyoToken');

contract('FroyoToken', ([alice, bob, carol, operator, owner]) => {
    beforeEach(async () => {
        this.froyo = await FroyoToken.new({ from: owner });
        this.burnAddress = '0x000000000000000000000000000000000000dEaD';
        this.zeroAddress = '0x0000000000000000000000000000000000000000';
    });

    it('only operator', async () => {
        assert.equal((await this.froyo.owner()), owner);
        assert.equal((await this.froyo.operator()), owner);

        await expectRevert(this.froyo.updateTransferTaxRate(500, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.froyo.updateBurnRate(20, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.froyo.updateMaxTransferAmountRate(100, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.froyo.updateSwapAndLiquifyEnabled(true, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.froyo.setExcludedFromAntiWhale(operator, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.froyo.updateFroyoSwapRouter(operator, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.froyo.updateMinAmountToLiquify(100, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.froyo.transferOperator(alice, { from: operator }), 'operator: caller is not the operator');
    });

    it('transfer operator', async () => {
        await expectRevert(this.froyo.transferOperator(operator, { from: operator }), 'operator: caller is not the operator');
        await this.froyo.transferOperator(operator, { from: owner });
        assert.equal((await this.froyo.operator()), operator);

        await expectRevert(this.froyo.transferOperator(this.zeroAddress, { from: operator }), 'PANTHER::transferOperator: new operator is the zero address');
    });

    it('update transfer tax rate', async () => {
        await this.froyo.transferOperator(operator, { from: owner });
        assert.equal((await this.froyo.operator()), operator);

        assert.equal((await this.froyo.transferTaxRate()).toString(), '500');
        assert.equal((await this.froyo.burnRate()).toString(), '20');

        await this.froyo.updateTransferTaxRate(0, { from: operator });
        assert.equal((await this.froyo.transferTaxRate()).toString(), '0');
        await this.froyo.updateTransferTaxRate(1000, { from: operator });
        assert.equal((await this.froyo.transferTaxRate()).toString(), '1000');
        await expectRevert(this.froyo.updateTransferTaxRate(1001, { from: operator }), 'PANTHER::updateTransferTaxRate: Transfer tax rate must not exceed the maximum rate.');

        await this.froyo.updateBurnRate(0, { from: operator });
        assert.equal((await this.froyo.burnRate()).toString(), '0');
        await this.froyo.updateBurnRate(100, { from: operator });
        assert.equal((await this.froyo.burnRate()).toString(), '100');
        await expectRevert(this.froyo.updateBurnRate(101, { from: operator }), 'PANTHER::updateBurnRate: Burn rate must not exceed the maximum rate.');
    });

    it('transfer', async () => {
        await this.froyo.transferOperator(operator, { from: owner });
        assert.equal((await this.froyo.operator()), operator);

        await this.froyo.mint(alice, 10000000, { from: owner }); // max transfer amount 25,000
        assert.equal((await this.froyo.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.froyo.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.froyo.balanceOf(this.froyo.address)).toString(), '0');

        await this.froyo.transfer(bob, 12345, { from: alice });
        assert.equal((await this.froyo.balanceOf(alice)).toString(), '9987655');
        assert.equal((await this.froyo.balanceOf(bob)).toString(), '11728');
        assert.equal((await this.froyo.balanceOf(this.burnAddress)).toString(), '123');
        assert.equal((await this.froyo.balanceOf(this.froyo.address)).toString(), '494');

        await this.froyo.approve(carol, 22345, { from: alice });
        await this.froyo.transferFrom(alice, carol, 22345, { from: carol });
        assert.equal((await this.froyo.balanceOf(alice)).toString(), '9965310');
        assert.equal((await this.froyo.balanceOf(carol)).toString(), '21228');
        assert.equal((await this.froyo.balanceOf(this.burnAddress)).toString(), '346');
        assert.equal((await this.froyo.balanceOf(this.froyo.address)).toString(), '1388');
    });

    it('transfer small amount', async () => {
        await this.froyo.transferOperator(operator, { from: owner });
        assert.equal((await this.froyo.operator()), operator);

        await this.froyo.mint(alice, 10000000, { from: owner });
        assert.equal((await this.froyo.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.froyo.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.froyo.balanceOf(this.froyo.address)).toString(), '0');

        await this.froyo.transfer(bob, 19, { from: alice });
        assert.equal((await this.froyo.balanceOf(alice)).toString(), '9999981');
        assert.equal((await this.froyo.balanceOf(bob)).toString(), '19');
        assert.equal((await this.froyo.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.froyo.balanceOf(this.froyo.address)).toString(), '0');
    });

    it('transfer without transfer tax', async () => {
        await this.froyo.transferOperator(operator, { from: owner });
        assert.equal((await this.froyo.operator()), operator);

        assert.equal((await this.froyo.transferTaxRate()).toString(), '500');
        assert.equal((await this.froyo.burnRate()).toString(), '20');

        await this.froyo.updateTransferTaxRate(0, { from: operator });
        assert.equal((await this.froyo.transferTaxRate()).toString(), '0');

        await this.froyo.mint(alice, 10000000, { from: owner });
        assert.equal((await this.froyo.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.froyo.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.froyo.balanceOf(this.froyo.address)).toString(), '0');

        await this.froyo.transfer(bob, 10000, { from: alice });
        assert.equal((await this.froyo.balanceOf(alice)).toString(), '9990000');
        assert.equal((await this.froyo.balanceOf(bob)).toString(), '10000');
        assert.equal((await this.froyo.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.froyo.balanceOf(this.froyo.address)).toString(), '0');
    });

    it('transfer without burn', async () => {
        await this.froyo.transferOperator(operator, { from: owner });
        assert.equal((await this.froyo.operator()), operator);

        assert.equal((await this.froyo.transferTaxRate()).toString(), '500');
        assert.equal((await this.froyo.burnRate()).toString(), '20');

        await this.froyo.updateBurnRate(0, { from: operator });
        assert.equal((await this.froyo.burnRate()).toString(), '0');

        await this.froyo.mint(alice, 10000000, { from: owner });
        assert.equal((await this.froyo.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.froyo.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.froyo.balanceOf(this.froyo.address)).toString(), '0');

        await this.froyo.transfer(bob, 1234, { from: alice });
        assert.equal((await this.froyo.balanceOf(alice)).toString(), '9998766');
        assert.equal((await this.froyo.balanceOf(bob)).toString(), '1173');
        assert.equal((await this.froyo.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.froyo.balanceOf(this.froyo.address)).toString(), '61');
    });

    it('transfer all burn', async () => {
        await this.froyo.transferOperator(operator, { from: owner });
        assert.equal((await this.froyo.operator()), operator);

        assert.equal((await this.froyo.transferTaxRate()).toString(), '500');
        assert.equal((await this.froyo.burnRate()).toString(), '20');

        await this.froyo.updateBurnRate(100, { from: operator });
        assert.equal((await this.froyo.burnRate()).toString(), '100');

        await this.froyo.mint(alice, 10000000, { from: owner });
        assert.equal((await this.froyo.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.froyo.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.froyo.balanceOf(this.froyo.address)).toString(), '0');

        await this.froyo.transfer(bob, 1234, { from: alice });
        assert.equal((await this.froyo.balanceOf(alice)).toString(), '9998766');
        assert.equal((await this.froyo.balanceOf(bob)).toString(), '1173');
        assert.equal((await this.froyo.balanceOf(this.burnAddress)).toString(), '61');
        assert.equal((await this.froyo.balanceOf(this.froyo.address)).toString(), '0');
    });

    it('max transfer amount', async () => {
        assert.equal((await this.froyo.maxTransferAmountRate()).toString(), '50');
        assert.equal((await this.froyo.maxTransferAmount()).toString(), '0');

        await this.froyo.mint(alice, 1000000, { from: owner });
        assert.equal((await this.froyo.maxTransferAmount()).toString(), '5000');

        await this.froyo.mint(alice, 1000, { from: owner });
        assert.equal((await this.froyo.maxTransferAmount()).toString(), '5005');

        await this.froyo.transferOperator(operator, { from: owner });
        assert.equal((await this.froyo.operator()), operator);

        await this.froyo.updateMaxTransferAmountRate(100, { from: operator }); // 1%
        assert.equal((await this.froyo.maxTransferAmount()).toString(), '10010');
    });

    it('anti whale', async () => {
        await this.froyo.transferOperator(operator, { from: owner });
        assert.equal((await this.froyo.operator()), operator);

        assert.equal((await this.froyo.isExcludedFromAntiWhale(operator)), false);
        await this.froyo.setExcludedFromAntiWhale(operator, true, { from: operator });
        assert.equal((await this.froyo.isExcludedFromAntiWhale(operator)), true);

        await this.froyo.mint(alice, 10000, { from: owner });
        await this.froyo.mint(bob, 10000, { from: owner });
        await this.froyo.mint(carol, 10000, { from: owner });
        await this.froyo.mint(operator, 10000, { from: owner });
        await this.froyo.mint(owner, 10000, { from: owner });

        // total supply: 50,000, max transfer amount: 250
        assert.equal((await this.froyo.maxTransferAmount()).toString(), '250');
        await expectRevert(this.froyo.transfer(bob, 251, { from: alice }), 'PANTHER::antiWhale: Transfer amount exceeds the maxTransferAmount');
        await this.froyo.approve(carol, 251, { from: alice });
        await expectRevert(this.froyo.transferFrom(alice, carol, 251, { from: carol }), 'PANTHER::antiWhale: Transfer amount exceeds the maxTransferAmount');

        //
        await this.froyo.transfer(bob, 250, { from: alice });
        await this.froyo.transferFrom(alice, carol, 250, { from: carol });

        await this.froyo.transfer(this.burnAddress, 251, { from: alice });
        await this.froyo.transfer(operator, 251, { from: alice });
        await this.froyo.transfer(owner, 251, { from: alice });
        await this.froyo.transfer(this.froyo.address, 251, { from: alice });

        await this.froyo.transfer(alice, 251, { from: operator });
        await this.froyo.transfer(alice, 251, { from: owner });
        await this.froyo.transfer(owner, 251, { from: operator });
    });

    it('update SwapAndLiquifyEnabled', async () => {
        await expectRevert(this.froyo.updateSwapAndLiquifyEnabled(true, { from: operator }), 'operator: caller is not the operator');
        assert.equal((await this.froyo.swapAndLiquifyEnabled()), false);

        await this.froyo.transferOperator(operator, { from: owner });
        assert.equal((await this.froyo.operator()), operator);

        await this.froyo.updateSwapAndLiquifyEnabled(true, { from: operator });
        assert.equal((await this.froyo.swapAndLiquifyEnabled()), true);
    });

    it('update min amount to liquify', async () => {
        await expectRevert(this.froyo.updateMinAmountToLiquify(100, { from: operator }), 'operator: caller is not the operator');
        assert.equal((await this.froyo.minAmountToLiquify()).toString(), '500000000000000000000');

        await this.froyo.transferOperator(operator, { from: owner });
        assert.equal((await this.froyo.operator()), operator);

        await this.froyo.updateMinAmountToLiquify(100, { from: operator });
        assert.equal((await this.froyo.minAmountToLiquify()).toString(), '100');
    });
});
