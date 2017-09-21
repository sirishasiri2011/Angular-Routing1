var myApp = angular.module('myApp', [
    'angular-ladda',
    'ngResource',
    'infinite-scroll',
    'angularSpinner',
    'jcs-autoValidate',
    'mgcrea.ngStrap',
    'toaster',
    'ngAnimate',
    'ui.router'
]);
myApp.config(function ($httpProvider,$resourceProvider,laddaProvider,$datepickerProvider){
    console.log("entering config")
    $httpProvider.defaults.headers.common['Authorization'] = 'Token dcecd9338164d7f63e9fc07f24b0a56dcda196b7',
        $resourceProvider.defaults.stripTrailingSlashes = false;
    laddaProvider.setOption({
        style: 'expand-right'
    });
    angular.extend($datepickerProvider.defaults,{
        dateFormat:'d/M/yyyy',
        autoclose:true

    });

})
myApp.config(function ($stateProvider, $urlRouterProvider) {
    $stateProvider
        .state('edit', {
            url:"/edit/:mail",
            templateUrl: 'templates/edit.html',
            controller: 'PersonDetailController'
        })
        .state('contact', {
            url: "/",
            templateUrl: 'templates/list.html',
            controller: 'PersonListController'
        })

    $urlRouterProvider.otherwise('/');
});

//contact
myApp.factory('Contact', function($resource){
    return $resource("https://api.codecraft.tv/samples/v1/contact/:id/", { id: '@id' }, {
        update: {
            method: 'PUT'
        },
        save:{
            method:'POST'
        }
    })
})
//custom filter
myApp.filter('defaultImage',function(){
    return function(input,param){
        console.log(input);
        console.log(param);
        if(!input){
            //return './avatar.png'
            return param
        }
        return input;
    }
})

myApp.service('ContactService', function(Contact,$q ,toaster){
    console.log(Contact);
    var self= {
        'addPerson': function (person) {
            this.persons.push(person);
        },
        'getPerson': function (email) {
            console.log(email);
            for (var i = 0; i < self.persons.length; i++) {
                var obj = self.persons[i];
                if (obj.email == email) {
                    return obj;
                }

            }
        },
        'page': 1,
        'hasMore': true,
        'isLoading': false,
        'isSaving': false,
        'selectedPerson': null,
        'persons': [],
        'search': null,
        'doSearch': function (search) {
            self.hasMore = true;
            self.page = 1;
            self.persons = [];
            self.search = search;
            self.loadContacts();
        },
        'doOrder': function (order) {
            self.hasMore = true;
            self.page = 1;
            self.persons = [];
            self.ordering = order;
            self.loadContacts();
        },
        'loadContacts': function () {
            if (self.hasMore && !self.isLoading) {// to call api only once
                self.isLoading = true;
                var params = { //data need to pass in pages to get data from api
                    'page': self.page,
                    'search': self.search, //pass searcha s a query parameter
                    'ordering': self.ordering

                };
                Contact.get(params, function (data) { //sending the page of data tat we want to request
                    console.log(data);
                    angular.forEach(data.results, function (person) {
                        self.persons.push(new Contact(person));
                    });
                    if (!data.next) {
                        self.hasMore = false;
                    }
                    self.isLoading = false;
                });
            }
        },
        'loadMore': function () {
            if (self.hasMore && !self.isLoading) {
                self.page += 1;
                self.loadContacts();
            }
        },
        'updateContact': function (person) {
            console.log("update service")
            self.isSaving = true;
            var d =$q.defer();
            person.$update().then(function () {
                self.isSaving = false; //when calling the update function the promise is returned automatically
                self.selectedPerson=null;
                self.hasMore=true;
                self.page=1;
                self.persons=[];
                self.loadContacts();
                toaster.pop('success', 'Updated' + person.name)
                d.resolve();
            })
            return d.promise;
        },
        'removeContact': function (person) {
            self.isDeleting = true;
            person.$remove().then(function () {
                self.isDeleting = false;
                var index = self.persons.indexOf(person);
                self.persons.splice(index, 1);
                self.selectedPerson = null;
                toaster.pop('success', 'deleted' + person.name)
            });
        },
        'createContact': function (person) {
            var d =$q.defer();
            console.log("create service")
            self.isSaving = true;
            Contact.save(person).$promise.then(function(){ //person we are editing is not from the resource,from main modal
                self.isSaving=false;
                self.selectedPerson=null;
                self.hasMore=true;
                self.page=1;
                self.persons=[];
                self.loadContacts();
                toaster.pop('success', 'Created' + person.name)
                d.resolve();//does when the saving finishes
            });
            return d.promise;
        }

    }

    self.loadContacts()
    return self;
})
myApp.controller('PersonDetailController', function ($scope, $stateParams, $state, ContactService) {
    $scope.contacts = ContactService;
    //$scope.contacts.selectedPerson = $scope.contacts.getPerson($stateParams.email);
    $scope.save = function () {
        $scope.contacts.updateContact($scope.contacts.selectedPerson)
    };

    $scope.remove = function () {
        $scope.contacts.removeContact($scope.contacts.selectedPerson)
    }
});

myApp.controller('PersonListController', function ($scope, $modal, ContactService) {

    $scope.search = "";
    $scope.order = "email";
    $scope.contacts = ContactService;

    $scope.loadMore = function () {
        console.log("Load More!!!");
        $scope.contacts.loadMore();
    };

    $scope.createContact = function () {
        console.log("createContact");
        $scope.contacts.createContact($scope.contacts.selectedPerson)
            .then(function () {
                $scope.createModal.hide();
            })
    };

    $scope.$watch('search', function (newVal, oldVal) {
        if (angular.isDefined(newVal)) {
            $scope.contacts.doSearch(newVal);
        }
    });

    $scope.$watch('order', function (newVal, oldVal) {
        if (angular.isDefined(newVal)) {
            $scope.contacts.doOrder(newVal);
        }
    })

});
