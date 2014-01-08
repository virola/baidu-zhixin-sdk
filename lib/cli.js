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



var start = function() {
    // 获取edp-webserver的配置
    var config = require('./conf');
    // 启动webserver
    var server = require('edp-webserver');

    server.start(config);
};

/**
 * 自动更新baidu-bae-sdk
 */
var autoUpdate = function() {
};

/**
 * @param {Array} args
 */
exports.parse = function(args) {
    args = args.slice(2);

    autoUpdate();

    start();
};

