/***************************************************************************
*
* Copyright (C) 2014 Baidu.com, Inc. All Rights Reserved
*
***************************************************************************/

/**
 * @file conf.js ~ 2014-01-08 12:46
 * @author sekiyika (px.pengxing@gmail.com)
 * @description
 * 提供给edp-webserver的默认配置
 */

// port
exports.port = 8081;

// Document root
exports.documentRoot = process.cwd();

var isDebug = false;

// handlers
exports.getLocations = function () {
    return [
        {
            location: '/ecomui/*', 
            handler: proxy(isDebug ? 'www.baidu.com' : 'www.baidu.com', 80)
        },
        {
            location: /\/.*/, 
            handler: (function() {
                return (function(context) {
                    var sdk = require('./sdk');
                    sdk.parse(context);
                });
            })()
        }
    ];
};

exports.injectResource = function ( res ) {
    for ( var key in res ) {
        global[ key ] = res[ key ];
    }
};
