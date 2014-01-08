/***************************************************************************
*
* Copyright (C) 2014 Baidu.com, Inc. All Rights Reserved
*
***************************************************************************/

/**
 * @file sdk.js ~ 2014-01-08 14:20
 * @author sekiyika (px.pengxing@gmail.com)
 * @description
 * sdk的主要方法
 */

var urlLib = require('url');
var fs = require('fs');
var http = require('http');
var querystring = require('querystring');
var path = require('path');
var glob = require('glob');   

/**
 * 分析url，取出模板，去请求vui的服务，然后渲染出来
 * @param {Object} context 请求的上下文
 */
exports.parse = function(context) {
    var request = context.request;
    var response = context.response;

    var url = urlLib.parse(request.url, true);

    if(!requestFilter(url)) {
        //TODO (by pengxing) 报错误信息
        return;
    }

    // 处理参数
    var params = processParams(url.query);


    // 获取模板和数据内容，填充到参数中
    params = fullfillParams(params);

    sendRequest(context, params, function(data) {
        // VUI返回的data其实是个JSON，包含左侧和右侧模板渲染结果
        data = JSON.parse(data);

        var left = data['left'];
        var right = data['right'];

        var leftHtml = '';
        for(var l in left) {
            leftHtml += left[l];
        }

        var rightHtml = '';
        for(var r in right) {
            rightHtml += right[r];
        }

        var tpl = fs.readFileSync(__dirname + path.sep + 'baidu.tpl').toString();
        tpl = tpl.replace('{%LEFT_CONTENTS%}', leftHtml);
        tpl = tpl.replace('{%RIGHT_CONTENTS%}', rightHtml);
        context.content = tpl;

        context.header.connection = 'close';

        context.statusCode = 200;
        context.start();
    });
};

/**
 * 过滤请求，只有/ /index.php /index.html /index.htm的请求会被接收
 * @return {!boolean} true表示正确，false表示拒收
 */
function requestFilter(url) {
    var allowedPath = {
        '/': 1,
        '/index.php': 1,
        '/index.html': 1,
        '/index.htm': 1
    };

    var pathname = url.pathname;

    if(allowedPath[pathname]) {
        return true;
    }

    return false;
};

function processParams(query) {
    // 处理参数
    var left = query['left'];
    var right = query['right'];

    if(!(left || !right)) {
        //TODO (by pengxing) 输出usage
        return false;
    }

    // 发送给VUI的参数
    var params = {
        'config': {
            'type': 'ecom' // 默认只支持ecom类型
        },
        'data': {
            'left': {},
            'right': {}
        }
    };

    if(left) {
        left = left.split(';');
        left.forEach(function(tpl) {
            if(tpl) {
                params.data.left[tpl] = {};
            }
        });
    }
    if(right) {
        right = right.split(';');
        right.forEach(function(tpl) {
            if(tpl) {
                params.data.right[tpl] = {};
            }
        });
    }


    return params;
};

/**
 * 根据模板名填充数据，获取测试用数据和
 */
function fullfillParams(params) {
    var basedir = process.cwd();

    // 根据模板名查找page.tpl文件
    var sep = path.sep;
    for(var tplName in params.data.left) {
        fullfillData(tplName);
    }

    function fullfillData(tplName) {
        var tpl = glob('**' + sep + tplName + sep + 'page.tpl', {
            'sync': true,
            'cwd': basedir + path.sep + 'src'
        });
        if(tpl.length > 0) {
            tpl = 'src' + sep + tpl[0];
            // 获取page.tpl
            var dir = path.dirname(tpl);
            var tplContent = fs.readFileSync(tpl).toString();

            // 获取测试数据
            var dataJson = fs.readFileSync(dir + sep + 'data.json').toString();
            params.data.left[tplName]['tpl'] = tplContent;
            params.data.left[tplName]['data'] = dataJson;
        }
    }

    return params;
};

/**
 * 请求VUI，将渲染的结果塞到回调函数中
 * @param {Object} context
 * @param {Object} params
 * @param {Function} callback
 */
function sendRequest(context, params, callback) {

    var destUrl = require('./config').get('VUI_ADDR');
    if(!destUrl) {
        destUrl = 'http://st01-ecom-sinan39.st01.baidu.com:8080/render.php';
    }

    var url = urlLib.parse(destUrl);
    var postData = querystring.stringify({
        'data': JSON.stringify(params)
    });

    var opts = {
        'host': url.hostname,
        'port': url.port,
        'path': url.path,
        'method': 'POST',
        'headers': {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': postData.length
        }
    };

    context.stop();
    var postRequest = http.request(opts, function(response) {
        var content = [];
        response.on('data', function (chunk) {
            content.push(chunk);
        });

        response.on('end', function() {
            callback(content.join(''));
        });

    });

    postRequest.on('error', function (err) {
        console.log('Requesting ' + chalk.blue('http://' + opts.host + ':' + opts.port + opts.path)
            + chalk.red(' error: ') + err.message
        );
        context.status = 500;
        context.content = '';
        context.start();
    });
    postRequest.write(postData);

    postRequest.end();
};

/**
 * 更新baidu.tpl
 */
function updateTpl() {
    //TODO (by pengxing) fullfill content
};
