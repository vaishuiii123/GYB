import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import "../../styles/TagManagement.css";
import { useState, useEffect, useMemo } from "react";
import {
  DeleteIconBtn,
  EditIconBtn,
} from "../../components/AdminActionIcons";
import { appConfirm } from "../../utils/appDialog";
import {
  ADMIN_CACHE_KEYS,
  fetchOnce,
  isAdminListCacheFresh,
  readAdminListCache,
  writeAdminListCache,
} from "../../utils/adminListCache";


type PageProps = {
    user?: any;
};

/** Named CSS colours so the stored value still renders as a colour. */
const TAG_COLORS = [
    "Blue",
    "Navy",
    "Teal",
    "Green",
    "Olive",
    "DarkGoldenrod",
    "Goldenrod",
    "Orange",
    "Red",
    "Maroon",
    "Pink",
    "Purple",
    "Brown",
    "Gray",
    "Black",
];


export default function TagManagement({ user }: PageProps) {


    const [tags, setTags] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [tagName, setTagName] = useState("");
    const [tagColor, setTagColor] = useState("");
    const [editMode, setEditMode] = useState(false);
    const [selectedTagId, setSelectedTagId] = useState("");

    // Keep a tag's existing colour selectable even if it predates this list
    const colorOptions = useMemo(()=>{

        const current = tagColor.trim();

        if(
            !current ||
            TAG_COLORS.some(
                (color)=>
                    color.toLowerCase() === current.toLowerCase()
            )
        ){
            return TAG_COLORS;
        }

        return [...TAG_COLORS, current];

    },[tagColor]);



    const fetchTags = async()=>{

        try{

            const response = await fetchOnce("/api/get-tags");

            const result = await response.json();


            if(result.success){

                const list = result.data || [];
                setTags(list);
                writeAdminListCache(ADMIN_CACHE_KEYS.tags, list);

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
        const cached = readAdminListCache<any[]>(ADMIN_CACHE_KEYS.tags);
        if (cached) {
            setTags(cached);
        }
        if (isAdminListCacheFresh(ADMIN_CACHE_KEYS.tags)) {
            return;
        }
        fetchTags();

    },[]);




    const handleSaveTag = async()=>{


        if(!tagName.trim() || !tagColor.trim()){

            alert("Please enter name and color");

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


        if(!tagName.trim() || !tagColor.trim()){

            alert("Please enter name and color");

            return;

        }


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
            await appConfirm(
                "Are you sure you want to delete this item?"
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
                    <div className="page-header page-header-end">
                        <button
                            className="create-btn"
                            onClick={() => {
                                setEditMode(false);
                                setTagName("");
                                setTagColor("");
                                setShowModal(true);
                            }}
                        >
                            + Create
                        </button>
                    </div>

                    <div className="tag-card">
                        <table className="tag-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
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
                                            No records available
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
                                                <div className="admin-action-group">
                                                    <EditIconBtn
                                                        onClick={() =>
                                                            handleEditTag(tag)
                                                        }
                                                    />
                                                    <DeleteIconBtn
                                                        onClick={() =>
                                                            handleDeleteTag(
                                                                tag.id
                                                            )
                                                        }
                                                    />
                                                </div>
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

                                {editMode ? "Edit" : "Create"}

                            </h2>



                            <div className="form-group">

                                <label>Name</label>


                                <input

                                    value={tagName}

                                    onChange={(e)=>
                                        setTagName(e.target.value)
                                    }

                                />


                            </div>




                            <div className="form-group">

                                <label>Color</label>


                                <div className="color-select-row">

                                    <span
                                        className="color-select-preview"
                                        style={{
                                            backgroundColor:
                                                tagColor || "transparent"
                                        }}
                                    ></span>

                                    <select

                                        className="color-select"

                                        value={tagColor}

                                        onChange={(e)=>
                                            setTagColor(e.target.value)
                                        }

                                    >

                                        <option value="">
                                            Select a color
                                        </option>

                                        {colorOptions.map((color)=>(

                                            <option
                                                key={color}
                                                value={color}
                                            >
                                                {color}
                                            </option>

                                        ))}

                                    </select>

                                </div>


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