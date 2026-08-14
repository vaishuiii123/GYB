const { getTableClient } = require("../shared/tableHelper");



module.exports = async function(context,req){

try{


const tableClient =
getTableClient("QuestionOptions");



const questionId =
req.query.questionId;



const options=[];



const entities =
tableClient.listEntities({

queryOptions:{
filter:"PartitionKey eq 'QuestionOption'"
}

});



for await(const entity of entities){


if(
!questionId ||
entity.QuestionId === questionId
){


options.push({

id:entity.rowKey,

questionId:entity.QuestionId,

optionText:entity.OptionText

});


}


}



context.res={

status:200,

body:{
success:true,
data:options
}

};


}

catch(error){

context.res={

status:500,

body:{
success:false,
message:error.message
}

};


}

};