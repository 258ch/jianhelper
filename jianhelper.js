var cheerio = require('cheerio');
var request = require('sync-request');
var fs = require('fs');
var process = require('process');
var ejs = require('ejs');
var jszip = require('jszip');

var types = {
	unknown: 0,
	user: 1,
	notebook: 2,
	collection: 3
}

var selectors = {
	article: '.title a',
	title: 'h1.title',
	author: 'a.author-name span',
	content: '.show-content'
};

var url = process.argv[2];
if(!url)
{
	showUsage();
	process.exit(0);
}

var startPage = process.argv[3];
startPage = startPage? Number.parseInt(startPage): 1;

var endPage = process.argv[4];
endPage = endPage? Number.parseInt(endPage): Number.POSITIVE_INFINITY;


var urlResult = checkUrl(url);
if(urlResult.type == types.unknown)
{
	showUsage();
	process.exit(0);
}

var url = getRealUrl(urlResult.type, urlResult.id, url);
var toc = [];

initPath();

for(var i = startPage; i <= endPage; i++)
{
	console.log('page: ' + i.toString())
	var pageUrl = url.replace(/\{page\}/, i.toString());
	var html = request('GET', pageUrl).getBody().toString();
	var li = getList(html);
	if(li.length == 0)
		break;
	for(var j in li)
	{
		var artUrl = li[j];
		var fname = /\/p\/(\w{12})/.exec(artUrl)[1] + '.html';
		var html = request('GET', artUrl).getBody().toString();
		var co = getContent(html);
		fs.writeFileSync('./out/OEBPS/Text/' + fname, co, {encoding: 'utf-8'});
		var title = /<h1>(.+?)<\/h1>/.exec(co)[1];
		toc.push({file: fname, title: title});
		console.log('article: ' + fname + ', title: ' + title);
	}
}

var uuidGenerator = require('./uuid.js');
var uuid = uuidGenerator.uuid();

console.log('Generate content.opf...')
var contentOpf = getContentOpf(toc, uuid);
fs.writeFileSync('./out/OEBPS/content.opf', contentOpf, {encoding: 'utf-8'})

console.log('Generate toc.ncx...')
var tocNcx = getTocNcx(toc, uuid);
fs.writeFileSync('./out/OEBPS/toc.ncx', tocNcx, {encoding: 'utf-8'})

console.log('Gnerate epub...');
generate();

console.log('Done..');

function showUsage() {
	var usage  = "用法：node jianhelper url [start [end]]\n\n" + 
		"    url：支持三种类型\n\n" + 
		"        http://www.jianshu.com/users/{id} 用户\n" + 
		"        http://www.jianshu.com/notebooks/{id} 文集\n" +
		"        http://www.jianshu.com/collection/{id} 专题\n\n" +
		"    start：起始页，默认为第一页\n\n" +
		"    end：终止页，默认为最后一页";
	console.log(usage);
}

function checkUrl(url)
{
	var regexes = {
		user: /^https?:\/\/www\.jianshu\.com\/users\/(\w{12})\/?$/,
		notebook: /^https?:\/\/www\.jianshu\.com\/notebooks\/(\d+)\/?$/,
		collection: /^https?:\/\/www\.jianshu\.com\/collection\/(\w{6,12})\/?$/
	};
	
	var type = types.unknown;
	var id;

	for(var k in regexes)
	{
		var rms;
		if(rms = regexes[k].exec(url))
		{
			type = types[k];
			id = rms[1];
			break;
		}
	}
	
	return {type: type, id: id};
}

function getRealUrl(type, id, url)
{
	if(type == types.user)
	{
		return 'http://www.jianshu.com/users/' + id + 
			'/latest_articles?page={page}';
	}
	else if(type == types.notebook)
	{
		return 'http://www.jianshu.com/notebooks/' + id + 
			'/latest?page={page}';
	}
	else if(type == types.collection)
	{
		var content = request('GET', url).getBody().toString();;
		var realId = /href="\/collections\/(\d+)\//.exec(content)[1];
		return 'http://www.jianshu.com/collections/' + realId +
			'/notes?order_by=added_at&page={page}';
	}
}

function getList(html)  {
	
	var $ = cheerio.load(html);
	
	var $list = $(selectors.article);
	var res = [];
	for(var i = 0; i < $list.length; i++)
	{
		var url = $list.eq(i).attr('href');
		if(!url.startsWith('http'))
			url = 'http://www.jianshu.com' + url;
		res.push(url);
	}
	return res;
}


function getContent(html) {
	var $ = cheerio.load(html);
	dealWithImg($);
	
	var header = '<html>\r\n<head>\r\n<title></title>\r\n' +
		'<link href="../Styles/Style.css" type="text/css" rel="stylesheet"/>' +
		'</head>\r\n<body>\r\n';
	
	var title = '<h1>' + $(selectors.title).text() + '</h1>';
	var author = '<p>作者：' + $(selectors.author).text() + '</p>';
	var content = $(selectors.content).html();
	
	var footer = '\r\n</body>\r\n</html>';
	
	return header + title + '\n' + author + '\n' + content + footer;
}

function initPath()
{
	try {fs.mkdirSync('./out');} catch(ex) {}
	try {fs.mkdirSync('./out/OEBPS');} catch(ex) {}
	try {fs.mkdirSync('./out/OEBPS/Text');} catch(ex) {}
	try {fs.mkdirSync('./out/OEBPS/Images');} catch(ex) {}
	//try {fs.mkdirSync('./out/OEBPS/Styles');} catch(ex) {}
	//try {fs.mkdirSync('./out/META-INF');} catch(ex) {}
	//fs.writeFileSync('./out/META-INF/container.xml', fs.readFileSync('./assets/container.xml'));
	//fs.writeFileSync('./out/mimetype', fs.readFileSync('./assets/mimetype'));
	//fs.writeFileSync('./out/OEBPS/Styles/Style.css', fs.readFileSync('./assets/Style.css'));
}

function dealWithImg($)
{
	var imgs = $(selectors.content + ' img');
	for(var i = 0; i < imgs.length; i++)
	{
		var img = imgs.eq(i);
		var url = img.attr('src');
		var co = request('GET', url).getBody();
		var fname = /[\w\-]+\.(?:jpg|png|gif)/.exec(url)[0];
		console.log('img: ' + fname);
		fs.writeFileSync('./out/OEBPS/Images/' + fname, co);
		img.attr('src', '../Images/' + fname);
	}
}

function getContentOpf(toc, uuid)
{
	var date = new Date();
	var dateStr 
		= date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
	
	return ejs.render(fs.readFileSync('content.ejs', 'utf-8'), {
		date: dateStr,
		toc: toc,
		uuid: uuid
	});
}

function getTocNcx(toc, uuid)
{
	return ejs.render(fs.readFileSync('toc.ejs', 'utf-8'), {
		toc: toc,
		uuid: uuid
	});
}

function generate()
{
	var zip = new jszip();
	zip.file('mimetype', fs.readFileSync('./assets/mimetype'));
	zip.file('META-INF/container.xml', fs.readFileSync('./assets/container.xml'));
	zip.file('OEBPS/Styles/Style.css', fs.readFileSync('./assets/Style.css'));
	zip.file('OEBPS/content.opf', fs.readFileSync('./out/OEBPS/content.opf'));
	zip.file('OEBPS/toc.ncx', fs.readFileSync('./out/OEBPS/toc.ncx'));
	
	var articles = fs.readdirSync('./out/OEBPS/Text');
	for(var i = 0; i < articles.length; i++)
	{
		var fname = articles[i];
		zip.file('OEBPS/Text/' + fname, fs.readFileSync('./out/OEBPS/Text/' + fname));
	}
	
	var images = fs.readdirSync('./out/OEBPS/Images');
	for(var i = 0; i < images.length; i++)
	{
		var fname = images[i];
		zip.file('OEBPS/Images/' + fname, fs.readFileSync('./out/OEBPS/Images/' + fname));
	}
	
	fs.writeFileSync('out.epub', zip.generate({type: 'nodebuffer', 'compression':'DEFLATE'}));
}