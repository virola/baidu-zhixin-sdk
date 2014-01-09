/***************************************************************************
*
* Copyright (C) 2013 Baidu.com, Inc. All Rights Reserved
*
*
***************************************************************************/

/**
 * @file cli.js ~ 2013-12-25 18:40
 * @author sekiyika (px.pengxing@gmail.com)
 * @description
 * 命令行的入口文件
 */

var defaultConfig = {
    'TPL_SERVER': 'http://pengxing.fe.baidu.com/baidu-zhixin-sdk/',
    'VUI_SERVER': 'http://st01-ecom-sinan39.st01.baidu.com:8080/render.php'
};

/**
 * 当前版本
 * @type {string}
 */
var currentVersion = JSON.parse(
    require( 'fs' ).readFileSync( 
        require( 'path' ).resolve( __dirname, '../package.json' ), 'UTF-8'
    )
).version;

/**
 * 自动更新baidu-bae-sdk
 */
var checkUpdate = function() {
    var config = require('./config');
    var checkUpdate = config.get('sys.checkupdate');
    var checkInterval = config.get('sys.checkinterval')
        || 1000 * 60 * 60 * 24;
    var lastCheck = config.get('sys.lastchecktime') || 0;
    var now = new Date();

    if(checkUpdate !== false && now - lastCheck > checkInterval) {
        // 发起请求，检查当前版本号是否最新
        console.log('Checking baidu-zhixin-sdk update......');
        var RegClient = require('npm-registry-client');
        (new RegClient(require('npmconf').defaults )).get('baidu-zhixin-sdk', function(error, data) {
            if (error) {
                return;
            }

            var semver = require('semver');
            var versions = Object.keys(data.versions || {}).map(function(version) {
                return version.replace(/beta\.(\d)$/, 'beta.0$1');
            });
            versions.sort(semver.rcompare);
            var maxVersion = versions[0] || '0.0.0';

            // 版本号比对和提示
            if(semver.gt(maxVersion, currentVersion)) {
                console.log('=.= The latest sdk version is `' + maxVersion 
                            + '`, please update your sdk use `npm update -g baidu-zhixin-sdk`');
            } else {
                console.log('^o^ Your baidu-zhixin-sdk is newest.');
            }

            // 保存更新检测的时间
            config.set('sys.lastchecktime', now.getTime());
        });
    }
};

/**
 * usage
 */
var usage = function() {
    console.log('');
};

/**
 * 启动sdk的方法
 */
var start = function(params) {
    params = params || {};
    // 获取edp-webserver的配置
    var config = require('./conf');

    for(var key in params) {
        config[key] = params[key];
    }

    // 启动webserver
    var server = require('edp-webserver');

    server.start(config);
};

/**
 * @param {Array} args
 */
exports.parse = function(args) {
    args = args.slice(2);
    if(args.length === 0) {
        args.push('start');
    }

    if(args[0] === '--version' || args[0] === '-v') {
        console.log('baidu-zhixin-sdk version ' + currentVersion);
        return;
    }

    var allowedCmd = ['start', 'updateTpl'];

    if(allowedCmd.indexOf(args[0]) === -1) {
        usage();
        return;
    }

    var params = {};

    for(var i = 1, l = args.length; i < l; i++) {
        var p = args[i];
        if(p.indexOf('--') !== 0) {
            usage();
            return;
        } else {
            p = p.substr(2);
        }

        var index = p.indexOf('=');
        if(index === -1) {
            params[p] = args[++i];
        } else {
            var arr = p.split('=');
            params[arr[0]] = arr[1];
        }
    }

    // 检查如果没有默认配置，则加上默认配置文件
    var config = require('./config');
    if(!config.get('TPL_SERVER')) {
        for(var key in defaultConfig) {
            config.set(key, defaultConfig[key]);
        }
    }
    var sdk = require('./sdk');
    switch(args[0]) {
        case 'start': 
            sdk.updateTpl(function() {
                start(params);
            });
            break;
        case 'updateTpl':
            sdk.updateTpl();
            break;
    };
   
    checkUpdate();

};

