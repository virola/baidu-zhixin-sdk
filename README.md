baidu-zhixin-sdk
==============

安装与更新
----------

baidu-zhixin-sdk已经发布到npm上，可以通过下面的npm命令来安装，`-g`选项是必选选项，使用`-g`全局安装后，可以获得command line的`baidu-zhixin-sdk`的命令，在Linux/Mac平台下，全局安装可能需要`sudo`。

    $ [sudo] npm install -g baidu-zhixin-sdk

如果想要升级当前baidu-zhixin-sdk的版本，请运行以下命令

    $ [sudo] npm update -g baidu-zhixin-sdk


使用
-----

    $ baidu-zhixin-sdk

    Usage: baidu-zhixin-sdk <command> [<args>]

    Builtin Commands:

    start       启动
    updateTpl   更新baidu.tpl模板文件


如下

    $ baidu-zhixin-sdk start --port=8080


