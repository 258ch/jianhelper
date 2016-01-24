# 简书助手

一个爬虫，可以用来爬取简书的文章，并生成EPUB格式。

## 用法

首先到[官网](https://nodejs.org/en/download/)下载并安装node.js。

```
git clone https://github.com/wizardforcel/jianhelper.git
cd jianhelper
npm install
node jianhelper url [start [end]]
```

url：支持三种类型

+ http://www.jianshu.com/users/{id} 用户
+ http://www.jianshu.com/notebooks/{id} 文集
+ http://www.jianshu.com/collection/{id} 专题

start：起始页，默认为第一页

end：终止页，默认为最后一页

## 注意

使用之前请手动清空目录下的`out`文件夹。

## TODO

+ 添加目录
+ 打包

## 协议

MIT-LICENSE