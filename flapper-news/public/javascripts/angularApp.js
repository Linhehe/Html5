var app = angular.module('flapperNews', ['ui.router']); // 将 ui.router作为依赖注入到我的应用中

// 使用 .config()方法来定义路由
app.config([
	'$stateProvider',
	'$urlRouterProvider',
	function($stateProvider, $urlRouterProvider) {
		
		$stateProvider // 状态配置对象
			.state('home', { // 给状态配置对象分配了一个名为 home的状态
				url: '/home',
				templateUrl: '/home.html',
				controller: 'MainCtrl',
				resolve: { // resolve 解析要注入到控制器中的依赖列表
				    postPromise: ['posts', function(posts){
				      return posts.getAll();
				    }]
				}
			})

			.state('posts', {
				url: '/posts/{id}',
				templateUrl: '/posts.html',
				controller: 'PostsCtrl',
				resolve: {
				    post: ['$stateParams', 'posts', function($stateParams, posts) {
				      return posts.get($stateParams.id);
				    }]
				}	
			})

			.state('login', {
			  url: '/login',
			  templateUrl: '/login.html',
			  controller: 'AuthCtrl',
			  onEnter: ['$state', 'auth', function($state, auth){
			    if(auth.isLoggedIn()){
			      $state.go('home');
			    }
			  }]
			})

			.state('register', {
			  url: '/register',
			  templateUrl: '/register.html',
			  controller: 'AuthCtrl',
			  onEnter: ['$state', 'auth', function($state, auth){
			    if(auth.isLoggedIn()){
			      $state.go('home');
			    }
			  }]
			});

		$urlRouterProvider.otherwise('home');
}]);

// app.factory就是搭建一个后台服务(posts)来储存我们的数据
app.factory('posts', ['$http', 'auth', function($http, auth){ // 这一行的posts是服务(server)的名字，而不是数组的名字
	var o = {
		posts: []
	}; // 新建了一个包含了 posts 的属性的对象 o
	
	// 使用 getAll()方法取出 posts服务中的 posts数组
	o.getAll = function() {
	    return $http.get('/posts').success(function(data){
	      angular.copy(data, o.posts);
	    });
  	};

  	// 添加一个能让用户新建 post的方法
  	o.create = function(post) {
  		return $http.post('/posts', post, {
  			headers: {Authorization: 'Bearer '+auth.getToken()}
  		}).success(function(data){
  			o.posts.push(data);
  		});
  	};

  	// 让 upvotes的变化也可以保存到数据库
  	o.upvote = function(post) {
  		return $http.put('/posts/' + post._id + '/upvote', null, {
  			headers: {Authorization: 'Bearer '+auth.getToken()}
  		})
  			.success(function(data){
  				post.upvotes += 1;
  			})
  	};

  	// 在服务中取出单个的 post (的id)
  	o.get = function(id) {
	  return $http.get('/posts/' + id).then(function(res){
	    return res.data;
	  });
	};

  	// 添加用来让用户添加评论(comments)的方法,然后从现有的 addComment()函数中调用它
  	o.addComment = function(id, comment) {
  		return $http.post('/posts/' + id + '/comments', comment, {
  			headers: {Authorization: 'Bearer '+auth.getToken()}
  		});
  	};

  	// 让用户对我评论的点赞数(upvote)可以保存到数据库中
  	o.upvoteComment = function(post, comment) {
	  return $http.put('/posts/' + post._id + '/comments/'+ comment._id + '/upvote', null, {
	  	headers: {Authorization: 'Bearer '+auth.getToken()}
	  })
	    .success(function(data){
	      comment.upvotes += 1;
	    });
	};

	return o;
}]);

app.factory('auth', ['$http', '$window', function($http, $window){
   var auth = {};

   auth.saveToken = function (token){
	  $window.localStorage['flapper-news-token'] = token;
	};

	auth.getToken = function (){
	  return $window.localStorage['flapper-news-token'];
	}

	auth.isLoggedIn = function(){
	  var token = auth.getToken();

	  if(token){
	    var payload = JSON.parse($window.atob(token.split('.')[1]));

	    return payload.exp > Date.now() / 1000;
	  } else {
	    return false;
	  }
	};

	auth.currentUser = function(){
	  if(auth.isLoggedIn()){
	    var token = auth.getToken();
	    var payload = JSON.parse($window.atob(token.split('.')[1]));

	    return payload.username;
	  }
	};

	auth.register = function(user){
	  return $http.post('/register', user).success(function(data){
	    auth.saveToken(data.token);
	  });
	};

	auth.logIn = function(user){
	  return $http.post('/login', user).success(function(data){
	    auth.saveToken(data.token);
	  });
	};

	auth.logOut = function(){
	  $window.localStorage.removeItem('flapper-news-token');
	};

   return auth;
}]);

app.controller('MainCtrl', [
	'$scope',
	'posts', // 这是server
	'auth',
	function($scope, posts, auth){ // 这里的posts也是server
		$scope.test = 'Hello world!';
		// 添加列表项(posts为一个数组)

		$scope.posts = posts.posts; // 因为数据绑定只适用于 $scope 中的变量，
		//所以我们这里应该把 $scope 中的posts数组传给 posts服务中的 posts数组；
		//现在我们对 $scope中的 posts数组的改变就会传入到服务中了

		$scope.isLoggedIn = auth.isLoggedIn;

		$scope.addPost = function(){
			if (!$scope.title || $scope.title === ''){ return; } // 这里是用来防止用户输入空的 title
			/*$scope.posts.push({
				title: $scope.title,
				upvotes: 0,
				link: $scope.link, // 把link添加到posts数组中去，js数组是可以动态增长的!!
				comments: [
					{author: 'Joe', body: 'Cool post!', upvotes: 0},
					{author: 'Bob', body: 'Great idea but everything is wrong!', upvotes: 0}
				]
			}); */ // 使用push()来给数组添加新的子项
			
			// 把 posts数组储存到 posts服务,这样用户输入的post就会被保存到后台数据库中，即便是再次刷新页面也依旧可以看见
			posts.create({
				title: $scope.title,
				link: $scope.link,
			});

			$scope.title = ''; // 这里是把$scope.title清空,以便于接收用户输入的下一个数据
			$scope.link = ''; // 把$scope.link清空,以便于接收用户输入的下一个数据
		}
		$scope.incrementUpvotes = function(post){
			//post.upvotes += 1;
			// 同样的，把 upvotes的变化储存到后台数据库
			posts.upvote(post); // 这里的 posts是服务
		}
	}]);

app.controller('PostsCtrl', [
	'$scope',
	//'$stateParams',
	'posts', 
	'post',
	'auth',
	function($scope, /*$stateParams,*/ posts, post, auth){
		//$scope.post = posts.posts[$stateParams.id];
		$scope.post = post;

		$scope.isLoggedIn = auth.isLoggedIn;

		$scope.addComment = function(){
			if($scope.body === '') { return; }
			/*$scope.post.comments.push({
				body: $scope.body,
				author: 'user',
				upvotes: 0
			});*/
			// 把用户输入的评论(comment)保存到数据库中
			posts.addComment(post._id, {
				body: $scope.body,
				author: 'user',
			}).success(function(comment) {
				$scope.post.comments.push(comment);
			});
			$scope.body = '';
		};
		$scope.incrementUpvotes = function(comment){
			//comment.upvotes += 1;
			// 把评论的点赞数的增加储存到数据库中
			posts.upvoteComment(post,comment);
		};
}]);

app.controller('AuthCtrl', [
	'$scope',
	'$state',
	'auth',
	function($scope, $state, auth){
	  $scope.user = {};

	  $scope.register = function(){
	    auth.register($scope.user).error(function(error){
	      $scope.error = error;
	    }).then(function(){
	      $state.go('home');
	    });
	  };

	  $scope.logIn = function(){
	    auth.logIn($scope.user).error(function(error){
	      $scope.error = error;
	    }).then(function(){
	      $state.go('home');
	    });
	  };
}]);

app.controller('NavCtrl', [
	'$scope',
	'auth',
	function($scope, auth){
	  $scope.isLoggedIn = auth.isLoggedIn;
	  $scope.currentUser = auth.currentUser;
	  $scope.logOut = auth.logOut;
}]);