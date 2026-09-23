const { getTableClient, escapeODataValue } = require("../shared/tableHelper");



module.exports = async function(context,req){

try{


const tableClient =
getTableClient("QuestionOptions");



const questionId =
req.query.questionId;



const options=[];


// Filter server side so a single question does not scan the table
const filter = questionId
? `PartitionKey eq 'QuestionOption' and QuestionId eq '${escapeODataValue(
String(questionId)
)}'`
: "PartitionKey eq 'QuestionOption'";


const entities =
tableClient.listEntities({

queryOptions:{
filter,
select:["RowKey","QuestionId","OptionText"]
}

});



for await(const entity of entities){


options.push({

id:entity.rowKey,

questionId:entity.QuestionId,

optionText:entity.OptionText

});


}


options.sort((a,b)=>String(a.id).localeCompare(String(b.id)));


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
