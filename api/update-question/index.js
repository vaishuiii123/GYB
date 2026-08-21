const { getTableClient } = require("../shared/tableHelper");
const {
  normalizeAttachmentsApplicable,
} = require("../shared/attachmentHelper");



module.exports = async function(context,req){


try{


const tableClient =
getTableClient("Questions");



const {
questionId,
questionText,
questionType,
tagId,
attachmentsApplicable,
modifiedBy
}=req.body;



const entity={

partitionKey:"Question",

rowKey:questionId,


QuestionText:questionText,

QuestionType:questionType,

TagId:tagId,

AttachmentsApplicable: normalizeAttachmentsApplicable(
  attachmentsApplicable
),


ModifiedBy:modifiedBy || "Admin",

ModifiedDate:new Date().toISOString()

};



await tableClient.updateEntity(
entity,
"Merge"
);



context.res={

status:200,

body:{
success:true,
message:"Question updated successfully."
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