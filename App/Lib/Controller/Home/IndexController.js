var fs = require("fs");
/**
 * controller
 * @return 
 */
module.exports = Controller(function(){
	/**
	 * 支持的类型列表
	 * @type {[type]}
	 */
	var supportTypeList = ['js', 'css', 'img', 'html'];
	/**
	 * 获取repeat的内容
	 * @param  {[type]} content [description]
	 * @param  {[type]} repeat  [description]
	 * @return {[type]}         [description]
	 */
	var getRepeatContent = function(content, size, b){
		size = b ? size : size * 1024;
		if (!size) {
			return "";
		};
		var length = content.length;
		var arr = new Array(parseInt(size / length) + 1);
		return arr.join(content);
	}

    return {
        indexAction: function(){
            if (this.get("type")) {
                return this.delayAction();
            };
            this.display();
        },
        
        /**
         * 检测参数
         * @return {[type]} [description]
         */
        checkPars: function(){
        	this.type = this.get('type').toLowerCase() || "js";
        	this.size = parseInt(this.get('size'), 10) || 0; //单位为KB
        	this.time = parseFloat(this.get('time'), 10) || 0; //单位为秒
        	this.execTime = parseFloat(this.get('exec'), 10) || 0; //单位为秒
            this.error = parseInt(this.get('error'), 10) || 0; //是否为错误
            if (this.error) {
                this.error = 1;
            };

        	var errmsg = "";
        	if (supportTypeList.indexOf(this.type) == -1) {
        		errmsg = "type value error";
        	}else if (this.size < 0 || this.size > 100) {
        		errmsg = 'size value error';
        	}else if(this.time < 0 || this.time > 10){
        		errmsg = 'time value error'
        	}else if(this.execTime < 0 || this.time > 10){
        		errmsg = 'exec value error';
        	}
        	if (errmsg) {
        		this.http.res.statusCode = 403;
        		this.end(errmsg);
        		return getDefer().promise;
        	};
        	return getPromise();
        },
        /**
         * 获取缓存文件内容
         * @return {[type]} [description]
         */
        getFilename: function(){
            var filename = this.size + "_" + this.execTime + "_" + this.error + "." + this.type;
            return filename;
        },
        /**
         * 获取内容的stream
         * @return {[type]} [description]
         */
        getContentStream: function(){
        	var filename = this.getFilename();
        	if (isFile(DATA_PATH + "/" + filename)) {
        		return fs.createReadStream(DATA_PATH + "/" + filename);
        	};
        	var content = "";
        	switch(this.type){
        		case 'css':
        			content = getRepeatContent('/**css, by welefen**/', this.size);
        			break;
        		case 'js':
        			var execContent = this.getExecTimeContent();
        			content = getRepeatContent('/**js, by welefen**/', this.size * 1024 - execContent.length, true) + execContent;
        			break;
                case 'html':
                    content = getRepeatContent('<!--html, by welefen-->', this.size);
                    break;
        		case 'img':
                    var content = this.getImgStream();
        			if (is_promise(content)) {
                        return content;
                    };
        			break;
        	}
        	setFileContent(DATA_PATH + "/" + filename, content);
        	return fs.createReadStream(DATA_PATH + "/" + filename);
        },
        /**
         * 获取图片的数据流
         * @return {[type]} [description]
         */
        getImgStream: function(){
            var filename = this.getFilename();
            if (this.error) {
                var content = getRepeatContent('/**img, by welefen**/', this.size);
                return content;
            };
        	var sourceFile = RESOURCE_PATH + "/resource/img/delay.jpg";
        	
            var deferred = getDefer();
        	
            var stream = fs.createReadStream(sourceFile , {
                'start':0, 
                'end': Math.max(504, this.size * 1024)
            }); 
            var writeStream = fs.createWriteStream(DATA_PATH + "/" + filename);
            stream.pipe(writeStream);
            stream.on("end", function(){
                deferred.resolve(fs.createReadStream(DATA_PATH + "/" + filename));
            })
			return deferred.promise;
        },
        /**
         * 获取js下执行的JS内容
         * @return {[type]} [description]
         */
        getExecTimeContent: function(){
        	if (!this.execTime) {
        		return '';
        	};
        	var str = ';(function(){var e=new Date*1;for(;;){var t=new Date*1,n=t-e;if(n>__DELTA__)break}});';
        	str = str.replace('__DELTA__', this.execTime * 1000);
        	return str;
        },
        /**
         * 设置Content-Type
         */
        setContentType: function(){
        	var type = '';
        	switch(this.type){
        		case 'js':
        			type = 'text/javascript';
        			break;
        		case 'css':
        			type = 'text/css';
        			break;
        		case 'img':
        			type = 'image/jpeg';
        			break;
                case 'html':
                    type = 'text/html';
                    break;
        		default:
        			break; 
        	}
        	this.header('Content-Type', type);
        },
        /**
         * 延迟action
         * @return {[type]} [description]
         */
        delayAction: function(){
        	var self = this;
        	this.checkPars().then(function(){
        		self.setContentType();
        		var stream = self.getContentStream();
                if (self.error) {
                    self.http.res.statusCode = 500;
                };
        		getPromise(stream).then(function(stream){
        			setTimeout(function(){
	        			stream.pipe(self.http.res);
			            stream.on("end", function(){
			                self.http.end();
			            })
	        		}, self.time * 1000);
        		});
        	})
        }
    }
});