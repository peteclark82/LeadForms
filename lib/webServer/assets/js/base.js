(function() {
  var module = angular.module("leadForms", ["ngRoute", "ui.router"]);
  module.config(function ($urlRouterProvider, $stateProvider) {
     // For any unmatched url, send to /route1
    //$urlRouterProvider.otherwise("/");
  });

  module.controller("viewLeads", function($scope, $http, $element) {
    $scope.leads = [];
    $scope.pageSize = 20;
    $scope.pageCount = 0;
    $scope.currentPage = 1;
    $scope.pages = [];

    $scope.viewPage = viewPage;
    $scope.leadChanged = leadChanged;

    viewPage($scope.currentPage);

    /* View Methods */
    function viewPage(pageIndex) {
      $http.get("/getleads?pagesize="+ $scope.pageSize +"&page="+ pageIndex)
        .success(function(data, status, headers, config) {
          $scope.currentPage = pageIndex;
          $scope.leads = data.leads;
          $scope.pageCount = data.pageCount;

          if ($scope.currentPage > $scope.pageCount) {
            $scope.currentPage = $scope.pageCount;
            alert("ERRORR!!");
            //viewPage($scope.currentPage);
          }

          $scope.pages = [];
          for(var i=0; i<$scope.pageCount; i++) {
            $scope.pages.push({
              text : (i+1),
              index : i+1
            });
          }
          if ($scope.currentPage - 1 > 0) {
            $scope.pages.unshift({ text : "Previous", index : $scope.currentPage - 1, icon : "triangle left" })
          }
          if ($scope.currentPage + 1 <= $scope.pageCount) {
            $scope.pages.push({ text : "Next", index : $scope.currentPage + 1, icon : "triangle right" })
          }
        })
        .error(function(data, status, headers, config) {
          console.log("Error getting leads")
          console.log(data);
        });
    }

    function leadChanged(lead) {
      var postData = [lead];
      $http.post("/updateleads", postData)
        .success(function(data, status, headers, config) {
          console.log("Successfully updated lead.");
        })
        .error(function(data, status, headers, config) {
          console.log("Error updating leads")
          console.log(data);
        });
    }
  });
})();


/* Semantic UI Stuff */
$(function() {
  $(".ui.dropdown").dropdown({ on : "hover" });
  $(".masthead .information").transition("scale in");
});
