import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import "../../styles/TagManagement.css";
import { useState, useEffect } from "react";
import { Pencil, Trash2 } from "lucide-react";


type PageProps = {
    user?: any;
};


export default function TagManagement({ user }: PageProps) {


    const [tags, setTags] = useState<any[]>([]);

    const [showModal, setShowModal] = useState(false);

    const [tagName, setTagName] = useState("");

    const [tagColor, setTagColor] = useState("");

    const [editMode, setEditMode] = useState(false);

    const [selectedTagId, setSelectedTagId] = useState("");



    const fetchTags = async()=>{

        try{

            const response = await fetch("/api/get-tags");

            const result = await response.json();


            if(result.success){

                setTags(result.data);

            }

        }
        catch(error){

            console.error(
                "Error fetching tags:",
                error
            );

        }

    };



    useEffect(()=>{

        fetchTags();

    },[]);




    const handleSaveTag = async()=>{


        if(!tagName.trim() || !tagColor.trim()){

            alert("Please enter Tag Name and Color");

            return;

        }


        try{


            const response = await fetch(
                "/api/create-tag",
                {

                    method:"POST",

                    headers:{
                        "Content-Type":"application/json"
                    },

                    body:JSON.stringify({

                        tagName,

                        tagColor,

                        createdBy:user?.name || "Admin"

                    })

                }
            );


            const result = await response.json();


            if(result.success){

                alert(result.message);

                setShowModal(false);

                setTagName("");

                setTagColor("");

                fetchTags();

            }
            else{

                alert(result.message);

            }


        }
        catch(error){

            console.error(error);

            alert("Something went wrong");

        }

    };





    const handleEditTag=(tag:any)=>{


        setEditMode(true);

        setSelectedTagId(tag.id);

        setTagName(tag.tagName);

        setTagColor(tag.tagColor);

        setShowModal(true);


    };






    const handleUpdateTag = async()=>{


        try{


            const response = await fetch(
                `/api/update-tag?id=${selectedTagId}`,
                {

                    method:"PUT",

                    headers:{
                        "Content-Type":"application/json"
                    },

                    body:JSON.stringify({

                        tagName,

                        tagColor,

                        modifiedBy:user?.name || "Admin"

                    })

                }
            );


            const result = await response.json();



            if(result.success){

                alert(result.message);

                setShowModal(false);

                setEditMode(false);

                setTagName("");

                setTagColor("");

                fetchTags();

            }

            else{

                alert(result.message);

            }


        }
        catch(error){

            console.error(error);

            alert("Update failed");

        }

    };






    const handleDeleteTag = async(id:string)=>{


        const confirmDelete =
            window.confirm(
                "Are you sure you want to delete this tag?"
            );


        if(!confirmDelete)
            return;



        try{


            const response = await fetch(
                `/api/delete-tag?id=${id}`,
                {
                    method:"DELETE"
                }
            );


            const result =
                await response.json();



            if(result.success){

                alert(result.message);

                fetchTags();

            }
            else{

                alert(result.message);

            }


        }
        catch(error){

            console.error(error);

            alert("Delete failed");

        }


    };





    return (

        <div className="tag-page">


            <Sidebar />


            <div className="tag-content">


                <Header user={user}/>



                <div className="tag-body">


                    <div className="breadcrumb">

                        Tag Management

                    </div>




                    <div className="page-header">


                        <h1 className="page-title">

                            Tags

                        </h1>


                        <button

                            className="create-btn"

                            onClick={()=>{

                                setEditMode(false);

                                setTagName("");

                                setTagColor("");

                                setShowModal(true);

                            }}

                        >

                            + Create Tag

                        </button>


                    </div>

                    <div className="tag-card">
                        <table className="tag-table">
                            <thead>
                                <tr>
                                    <th>
                                        Tag Name
                                    </th>
                                    <th>
                                        Actions
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                            {
                                tags.length===0 ? (

                                    <tr>

                                        <td>
                                            No Tags Available
                                        </td>

                                        <td></td>

                                    </tr>

                                )

                                :

                                (

                                    tags.map((tag)=>(


                                        <tr key={tag.id}>


                                            <td>

                                                <div className="tag-name">


                                                    <span

                                                        className="tag-dot"

                                                        style={{
                                                            backgroundColor:
                                                            tag.tagColor
                                                        }}

                                                    ></span>



                                                    <span

                                                        style={{
                                                            color:
                                                            tag.tagColor
                                                        }}

                                                    >

                                                        {tag.tagName}

                                                    </span>


                                                </div>

                                            </td>




                                            <td>


                                                <button

                                                    className="tag-edit-btn"

                                                    onClick={()=>
                                                        handleEditTag(tag)
                                                    }

                                                >

                                                    <Pencil size={16}/>

                                                    Edit
                                                </button>

                                                <button
                                                    className="tag-delete-btn"
                                                    onClick={()=>
                                                        handleDeleteTag(tag.id)
                                                    }
                                                >
                                                    <Trash2 size={16}/>
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )
                            }
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showModal && (

                    <div className="modal-overlay">


                        <div className="modal">


                            <h2>

                                {
                                    editMode
                                    ?
                                    "Edit Tag"
                                    :
                                    "Create Tag"
                                }

                            </h2>



                            <div className="form-group">

                                <label>
                                    Tag Name
                                </label>


                                <input

                                    value={tagName}

                                    onChange={(e)=>
                                        setTagName(e.target.value)
                                    }

                                />


                            </div>




                            <div className="form-group">

                                <label>
                                    Tag Color
                                </label>


                                <input

                                    value={tagColor}

                                    onChange={(e)=>
                                        setTagColor(e.target.value)
                                    }

                                />


                            </div>





                            <div className="modal-buttons">


                                <button

                                    className="cancel-btn"

                                    onClick={()=>{

                                        setShowModal(false);

                                        setEditMode(false);

                                    }}

                                >

                                    Cancel

                                </button>



                                <button

                                    className="save-btn"

                                    onClick={
                                        editMode
                                        ?
                                        handleUpdateTag
                                        :
                                        handleSaveTag
                                    }

                                >

                                    Save

                                </button>


                            </div>



                        </div>


                    </div>


                )
            }



        </div>

    );

}