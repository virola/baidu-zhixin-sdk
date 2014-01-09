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
var chalk = require('chalk');

/**
 * 分析url，取出模板，去请求vui的服务，然后渲染出来
 * @param {Object} context 请求的上下文
 */
exports.parse = function(context) {
    var request = context.request;
    var response = context.response;

    var url = urlLib.parse(request.url, true);

    if(!requestFilter(url)) {
        end(context, usage());
        return;
    }
    console.log('Requesting: ' + request.url);

    // 处理参数
    var params = processParams(url.query);
    if(params === false) {
        end(context, usage());
        return;
    }

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

        end(context, tpl);
    });
};

function usage() {
    return [
        'usage:',
        '   baidu-zhixin-sdk start',
        '   baidu-zhixin-sdk start --port=8080',
        '   baidu-zhixin-sdk start --port 8080',
        '   baidu-zhixin-sdk updateTpl',
        '',
        'args:',
        '   port => 指定启动的端口',
        '',
        '访问方式:',
        '   http://127.0.0.1:8080/?left=ecl_ec_weigou;ecl_health_ad&right=ecr_edu_relative',
        '',
        'Thanks'
    ].join('\n');
};

/**
 * 输出一些信息，结束此次请求
 */
function end(context, msg) {
    context.content = msg;

    context.header.connection = 'close';

    context.statusCode = 200;
    context.start();
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

    var destUrl = require('./config').get('VUI_SERVER');
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
 * @param {function=} opt_callback
 */
function updateTpl(opt_callback) {
    var config = require('./config');
    var tplServer = config.get('TPL_UPDATE_SERVER');
    if(!tplServer) {
        tplServer = 'http://pengxing.fe.baidu.com/baidu-zhixin-sdk/'
    }

    var version = config.get('TPL_VERSION').trim();
    
    console.log('Checking the baidu.tpl version...');
    // 获取版本号
    http.get(tplServer + 'version', function(res) {
        var newVersion = [];
        res.on('data', function(chunk) {
            newVersion.push(chunk);
        });
        res.on('end', function() {
            newVersion = newVersion.join('').trim();
            if(newVersion !== version) {
                console.log('Updating the baidu.tpl... Version: ' + chalk.green(newVersion));

                // 获取最新模板内容
                http.get(tplServer + 'baidu.tpl', function(res) {
                    var tpl = [];
                    res.on('data', function(chunk) {
                        tpl.push(chunk);
                    });
                    res.on('end', function() {
                        tpl = tpl.join('');

                        // 写到文件中
                        fs.writeFileSync(__dirname + path.sep + 'baidu.tpl', tpl);

                        // 更新config文件
                        config.set('TPL_VERSION', newVersion);

                        console.log('Update baidu.tpl DONE!');
                        opt_callback ? opt_callback() : '';
                    });
                })
            } else {
                console.log('baidu.tpl is the newest!');
                opt_callback ? opt_callback() : '';
            }
        });
    });

};
exports.updateTpl = updateTpl;
