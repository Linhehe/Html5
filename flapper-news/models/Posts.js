var mongoose = require('mongoose'); /* 注册*/

var PostSchema = new mongoose.Schema({
  title: String,
  link: String,
  upvotes: {type: Number, default: 0}, /* 初始化 upvotes为0 */
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }] /* 设置 comments去引用 Comments数组 */
});

PostSchema.methods.upvote = function(cb) {
  this.upvotes += 1;
  this.save(cb);
};

mongoose.model('Post', PostSchema);

/*这里定义了 Post模型，它拥有我们需要储存的几个数据类型的属性*/