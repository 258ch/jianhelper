# 简书助手

爬取简书的文章，并生成EPUB格式。

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

## TODO

+ 添加标题、封面

## 协议

MIT-LICENSE
