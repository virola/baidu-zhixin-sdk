/***************************************************************************
*
* Copyright (C) 2013 Baidu.com, Inc. All Rights Reserved
*
***************************************************************************/

/**
 * @file config.js ~ 2013-12-25 18:46
 * @author sekiyika (px.pengxing@gmail.com)
 * @description
 * 保存和获取配置
 */

var fs = require('fs');
var path = require('path');

/**
 * @type {string}
 */
var CONFIG_FILE_NAME = '.baidu-zhixin-sdk';

var FILE_ENCODING = 'UTF-8';

/**
 * 获取配置文件存储的目录
 *
 * @return {string} 配置文件存储目录
 */
function getConfigHome() {
    var os = require('os');

    return process.env[os.platform() === 'win32' ? 'APPDATA' : 'HOME'];
};

/**
 *
 */
function getConfigFile() {
    return path.resolve(getConfigHome(), CONFIG_FILE_NAME);
};

/**
 *
 */
exports.all = function() {
    var config = {};
    var configFile = getConfigFile();

    if(fs.existsSync(configFile)) {
        config = JSON.parse(fs.readFileSync(configFile, FILE_ENCODING))
    }

    return config;
};

/**
 * 
 */
exports.get = function(key) {
    return exports.all()[key];
};

/**
 *
 */
exports.set = function(key, value) {
    var config = exports.all();
    config[key] = value;

    var configFile = getConfigFile();
    fs.writeFileSync(configFile, JSON.stringify(config, null, 4), FILE_ENCODING);
};
