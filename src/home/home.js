import React from 'react';
import 'antd/dist/antd.css';
import './home.scss';
import Web3 from 'web3';
import { Button, Input } from 'antd';
import { Pagination } from 'antd';

import {
    get_balance,
    get_allowance,
    get_list_data,
    format_Shortfall,
    handle_list_click,
    input_chang,
    click_liquidate,
    click_max,
    format_bn,
    handle_approve,
    calc_balance_to_USD,
    i_want_received_token,
    i_want_send_token,
    change_page,
    get_list_data_p
} from './utils';

import logo from '../images/logo.svg';
import logo_d from '../images/logo-d.png';
import telegram from '../images/telegram.svg';
import twitter from '../images/twitter.svg';
import lock from '../images/lock.svg';

let mMarket_abi = require('../ABIs/moneyMarket.json');
let WETH_abi = require('../ABIs/WETH_ABI.json');
let USDx_abi = require('../ABIs/USDX_ABI.json');
let USDT_abi = require('../ABIs/USDT_ABI.json');
let Liquidate_ABI = require('../ABIs/Liquidate_ABI.json');
let imBTC_ABI = require('../ABIs/imBTC_ABI.json');

let address = require('../ABIs/address_map.json');



export default class Home extends React.Component {
    constructor(porps) {
        super(porps);

        this.state = {
            data: [
                {
                    key: 0,
                    shortfallWeth: '0.00',
                    address: '...',
                    Supply: '0.00',
                    Borrow: '0.00',
                    collateralRate: '0.00%',
                }
            ],
            index: 0,
            decimals: {
                USDx: 18,
                WETH: 18,
                USDT: 6
            },
            max_liquidate: {
                USDx: {},
                WETH: {},
                USDT: {}
            },
            amount_to_liquidate: '',
            data_is_ok: false,
            is_btn_enable: true,
            cur_page: 1,
            pageSize: 15
        }

        this.new_web3 = window.new_web3 = new Web3(Web3.givenProvider || null);
        this.bn = this.new_web3.utils.toBN;

        this.new_web3.eth.net.getNetworkType().then(
            (net_type) => {
                let mMarket = new this.new_web3.eth.Contract(mMarket_abi, address[net_type]['mMarket']);
                let WETH = new this.new_web3.eth.Contract(WETH_abi, address[net_type]['WETH']);
                let USDx = new this.new_web3.eth.Contract(USDx_abi, address[net_type]['USDx']);
                let USDT = new this.new_web3.eth.Contract(USDT_abi, address[net_type]['USDT']);
                let imBTC = new this.new_web3.eth.Contract(imBTC_ABI, address[net_type]['imBTC']);
                let Liquidate = new this.new_web3.eth.Contract(Liquidate_ABI, address[net_type]['liquidator']);

                this.new_web3.givenProvider.enable().then(res_accounts => {
                    this.setState({
                        net_type: net_type,
                        mMarket: mMarket,
                        WETH: WETH,
                        USDx: USDx,
                        USDT: USDT,
                        imBTC: imBTC,
                        Liquidate: Liquidate,
                        my_account: res_accounts[0]
                    }, () => {
                        get_allowance(this, address[this.state.net_type]['liquidator']);
                        get_list_data(this, 1);
                        get_balance(this);

                        this.state.mMarket.methods.assetPrices(address[this.state.net_type]['USDx']).call().then(res_usdx_price => {
                            console.log('res_usdx_price:', res_usdx_price);
                            this.setState({ usdx_price: res_usdx_price }, () => {
                                // get_list_data(this, 1);
                                // get_balance(this);
                            })
                        })
                    })
                })
            }
        )

        // add accounts changed
        if (window.ethereum.on) {
            window.ethereum.on('accountsChanged', (accounts) => {
                console.log('accountsChanged: ', accounts[0]);
                this.setState({
                    my_account: accounts[0]
                }, () => {
                    console.log('connected: ', this.state.my_account);
                    get_allowance(this, address[this.state.net_type]['liquidator']);
                    get_list_data(this, 1);
                    get_balance(this);
                })
            });
        }


        this.update_list_timer = setInterval(() => {
            get_balance(this);
            get_list_data_p(this, 1);
        }, 1000 * 15)
    }






    click_connect = () => {
        this.new_web3.givenProvider.enable().then(res_accounts => {
            this.setState({ my_account: res_accounts[0] }, () => {
                get_balance(this);
                get_allowance(this, address[this.state.net_type]['liquidator']);

                this.state.mMarket.methods.assetPrices(address[this.state.net_type]['USDx']).call().then(res_usdx_price => {
                    console.log('res_usdx_price:', res_usdx_price);
                    this.setState({ usdx_price: res_usdx_price }, () => {
                        get_list_data(this, 1);
                    })
                })
            })
        })
    }


    render() {
        return (
            <React.Fragment>
                <div className='top'>
                    <div className='top-left'>
                        <img src={logo_d} alt='' />
                    </div>
                    <div className='top-center'>
                        <img src={logo} alt='' />
                    </div>
                    <div className='top-right'>
                        {
                            !this.state.my_account && <div className='top-right-btn'>Connect</div>
                        }
                        {
                            this.state.my_account &&
                            <div className='top-right-account'>{this.state.my_account.slice(0, 6) + '...' + this.state.my_account.slice(-6)}</div>
                        }
                    </div>
                    <div className='clear'></div>
                </div>


                <div className='main-body'>
                    <div className='main-body-left'>
                        <div className='main-body-list'>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Shortfall (WETH)</th>
                                        <th>Account</th>
                                        <th>Supply Balance($)</th>
                                        <th>Borrow Balance($)</th>
                                        <th>Collateralization ratio</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {
                                        this.state.data.map(item => {
                                            return (
                                                <tr
                                                    key={item.key}
                                                    onClick={() => { handle_list_click(this, item.key) }}
                                                    className={this.state.index === item.key ? 'active' : ''}
                                                >
                                                    <td>{format_Shortfall(item.shortfallWeth)}</td>
                                                    <td>{item.address.slice(0, 6) + '...' + item.address.slice(-4)}</td>
                                                    <td>{item.Supply}</td>
                                                    <td>{item.Borrow}</td>
                                                    <td>{item.collateralRate}</td>
                                                </tr>
                                            )
                                        })
                                    }
                                </tbody>
                            </table>
                        </div>

                        <div className='page'>
                            <Pagination
                                showQuickJumper
                                pageSize={this.state.pageSize}
                                defaultCurrent={this.state.cur_page}
                                total={this.state.totalSize ? this.state.totalSize : 0}
                                onChange={(page, pageSize) => { change_page(this, page, pageSize) }}
                            />
                        </div>
                    </div>


                    <div className='main-body-right'>
                        <div className='main-body-balance'>
                            {/* <h3>Wallet Balances</h3> */}
                            <table>
                                <thead>
                                    <tr>
                                        <th className='th-1'>Asset</th>
                                        <th className='th-2'>Balance</th>
                                        {/* <th className='th-3'>USD</th> */}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className='td-1'>{'ETH'}</td>
                                        <td className='td-2'>{this.state.my_eth_balance ? format_bn(this.state.my_eth_balance, 18, 2) : '0'}</td>
                                        {/* <td className='td-3'>{'$'}</td> */}
                                    </tr>

                                    <tr>
                                        <td className='td-1'>
                                            {'WETH'}
                                            {
                                                !this.state.weth_approved &&
                                                <img alt='' src={lock} onClick={() => { handle_approve(this, this.state.WETH, address[this.state.net_type]['liquidator'], 'weth') }} />
                                            }
                                        </td>
                                        <td className='td-2'>{this.state.my_weth_balance ? format_bn(this.state.my_weth_balance, 18, 2) : '0'}</td>
                                        {/* <td className='td-3'>{'$'}</td> */}
                                    </tr>

                                    <tr>
                                        <td className='td-1'>
                                            {'USDx'}
                                            {
                                                !this.state.usdx_approved &&
                                                <img alt='' src={lock} onClick={() => { handle_approve(this, this.state.USDx, address[this.state.net_type]['liquidator'], 'usdx') }} />
                                            }
                                        </td>
                                        <td className='td-2'>{this.state.my_usdx_balance ? format_bn(this.state.my_usdx_balance, 18, 2) : '0'}</td>
                                        {/* <td className='td-3'>{'$'}</td> */}
                                    </tr>

                                    <tr>
                                        <td className='td-1'>
                                            {'USDT'}
                                            {
                                                !this.state.usdt_approved &&
                                                <img alt='' src={lock} onClick={() => { handle_approve(this, this.state.USDT, address[this.state.net_type]['liquidator'], 'usdt') }} />
                                            }
                                        </td>
                                        <td className='td-2'>{this.state.my_usdt_balance ? format_bn(this.state.my_usdt_balance, 6, 2) : '0'}</td>
                                        {/* <td className='td-3'>{'$'}</td> */}
                                    </tr>

                                    <tr>
                                        <td className='td-1'>
                                            {'imBTC'}
                                            {
                                                !this.state.imbtc_approved &&
                                                <img alt='' src={lock} onClick={() => { handle_approve(this, this.state.imBTC, address[this.state.net_type]['liquidator'], 'imbtc') }} />
                                            }
                                        </td>
                                        <td className='td-2'>{this.state.my_imbtc_balance ? format_bn(this.state.my_imbtc_balance, 8, 2) : '0'}</td>
                                        {/* <td className='td-3'>{'$'}</td> */}
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className='main-body-details'>
                            {/* <h3>Liquidation</h3> */}
                            <div className='account'>
                                <span className='account-title'>Account:</span>
                                <span className='account-address'>
                                    {this.state.data[this.state.index].address}
                                </span>
                            </div>
                            <div className='supply-table'>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Supply</th>
                                            <th>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {
                                            this.state.data[this.state.index].supply &&
                                            this.state.data[this.state.index].supply.map(supply_item => {
                                                return (
                                                    <tr
                                                        key={supply_item.asset}
                                                        onClick={() => { i_want_received_token(this, supply_item) }}
                                                        className={supply_item.symbol === this.state.i_want_received ? 'active' : ''}
                                                    >
                                                        <td>{supply_item.symbol}</td>
                                                        <td>{format_Shortfall(supply_item.amount)}</td>
                                                    </tr>
                                                )
                                            })
                                        }

                                    </tbody>
                                </table>
                            </div>

                            <div className='borrow-table'>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Borrow</th>
                                            <th>Amount</th>
                                            <th className='escpecil'>MAX Liquidation</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {
                                            this.state.data[this.state.index].borrow &&
                                            this.state.data[this.state.index].borrow.map(borrow_item => {
                                                return (
                                                    <tr
                                                        key={borrow_item.asset}
                                                        onClick={() => { i_want_send_token(this, borrow_item) }}
                                                        className={borrow_item.symbol === this.state.i_want_send ? 'active' : ''}
                                                    >
                                                        <td>{borrow_item.symbol}</td>
                                                        <td>{format_Shortfall(borrow_item.amount)}</td>
                                                        <td className='escpecil'>
                                                            {
                                                                borrow_item.symbol === this.state.i_want_send && this.state.max_liquidate_amount ?
                                                                    format_Shortfall(this.state.max_liquidate_amount_show) : ''
                                                            }
                                                        </td>
                                                    </tr>
                                                )
                                            })
                                        }
                                    </tbody>
                                </table>
                            </div>

                            <div className='liquidate'>
                                <div className='liquidate-title'>
                                    <span>RequestedAmountClose</span>
                                    <span style={{ color: '#8472FF' }}>
                                        {
                                            this.state.i_want_send ?
                                                ' (' + this.state.i_want_send + ')' : ''
                                        }
                                    </span>
                                </div>
                                <div className='liquidate-con'>
                                    <div className='input-wrap'>
                                        <Input
                                            placeholder='number'
                                            type='number'
                                            onChange={(e) => { input_chang(this, e.target.value) }}
                                            value={this.state.amount_to_liquidate}
                                        />
                                        <span className='max-tips' onClick={() => { click_max(this) }}>MAX</span>
                                    </div>
                                    <div className='button-wrap'>
                                        <Button
                                            onClick={() => { click_liquidate(this) }}
                                            className={this.state.is_btn_enable ? null : 'disable-button'}
                                        >
                                            LIQUIDATE
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className='clear'></div>
                </div>


                <div className='footer'>
                    <div className='footer-left'>
                        <a href='www.abc.com' target='_blank'>GitHub</a>
                        <a href='www.abc.com' target='_blank'>FAQ</a>
                    </div>

                    <div className='footer-right'>
                        <a href='www.abc.com' target='_blank'><img src={telegram} alt='' /></a>
                        <a href='www.abc.com' target='_blank'><img src={twitter} alt='' /></a>
                    </div>
                    <div className='clear'></div>
                </div>

            </React.Fragment >
        )
    }
}
