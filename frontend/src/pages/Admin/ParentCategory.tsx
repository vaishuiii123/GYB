import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import "../../styles/CategoryManagement.css";
import { useState, useEffect } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";

type PageProps = {
  user?: any;
};

export default function ParentCategory({ user }: PageProps) {

    const navigate = useNavigate();

    const { middleCategoryId } = useParams();

    const location = useLocation();

    const middleCategoryName = location.state?.middleCategoryName || "Middle Category";

    const topCategoryName = location.state?.topCategoryName || "";

    const [parentCategories, setParentCategories] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [parentCategoryName, setParentCategoryName] = useState("");

    const [editMode, setEditMode] = useState(false);
    const [selectedParentCategoryId, setSelectedParentCategoryId] = useState("");

    const fetchParentCategories = async () => {
        try {
            if(!middleCategoryId){
                alert("Middle Category not found");
                return;
            }
            const response = await fetch(`/api/get-parent-categories?middleCategoryId=${middleCategoryId}`);
            const result = await response.json();

            if(result.success){
                setParentCategories(result.data);
            }
        }
        catch(error){
            console.error(
                "Error fetching parent categories:",
                error
            );
        }
    };

    const handleSaveParentCategory = async () => {
        if(!parentCategoryName.trim()){
            alert("Please enter Parent Category Name");
            return;
        }

        try{
            const response = await fetch("/api/create-parent-category",{
                method:"POST",
                headers:{
                    "Content-Type":"application/json",
                },
                body:JSON.stringify({
                    middleCategoryId,
                    parentCategoryName,
                    createdBy:user?.name || "Admin"
                })
            });

            const result = await response.json();

            if(result.success){
                alert(result.message);
                setShowModal(false);
                setParentCategoryName("");
                fetchParentCategories();
            }
            else{
                alert(result.message);
            }
        }
        catch(error){
            console.error(error);
            alert("Something went wrong.");
        }
    };

    const handleEditParentCategory = (category:any) => {
        setEditMode(true);
        setSelectedParentCategoryId(category.id);
        setParentCategoryName(category.parentCategoryName);
        setShowModal(true);
    };

    const handleUpdateParentCategory = async () => {

        if(!parentCategoryName.trim()){
            alert("Please enter Parent Category Name");
            return;
        }
        try{
            const response = await fetch(
                `/api/update-parent-category?id=${selectedParentCategoryId}`,
                {
                    method:"PUT",
                    headers:{
                        "Content-Type":"application/json",
                    },
                    body:JSON.stringify({
                        parentCategoryName,
                        modifiedBy:user?.name || "Admin"
                    })
                }
            );
            const result = await response.json();

            if(result.success){
                alert(result.message);
                setShowModal(false);
                setParentCategoryName("");
                setEditMode(false);
                setSelectedParentCategoryId("");
                fetchParentCategories();
            }
            else{
                alert(result.message);
            }
        }
        catch(error){
            console.error(error);
            alert("Update failed.");
        }
    };

    const handleDeleteParentCategory = async (id:string) => {
        const confirmDelete = window.confirm(
            "Are you sure you want to delete this Parent Category?"
        );

        if(!confirmDelete){
            return;
        }
        try{
            const response = await fetch(
                `/api/delete-parent-category?id=${id}`,
                {
                    method:"DELETE"
                }
            );

            const result = await response.json();

            if(result.success){
                alert(result.message);
                fetchParentCategories();
            }
            else{
                alert(result.message);
            }
        }
        catch(error){
            console.error(error);
            alert("Delete failed.");
        }
    };

    useEffect(()=>{
        fetchParentCategories();
    },[middleCategoryId]);

    return (
        <div className="category-page">
            <Sidebar />
            <div className="category-content">
                <Header user={user}/>
                <div className="category-body">
                   <div className="breadcrumb">
                    <span
                        onClick={() => navigate("/category")}
                        style={{cursor:"pointer"}}
                    >
                        Category Management
                    </span>
                    {" > "}
                    <span
                        onClick={() =>
                        navigate(`/middle-category/${middleCategoryId}`, {
                        state:{
                        topCategoryName: location.state?.topCategoryName
                    }
                    })
                    }
                    style={{cursor:"pointer"}}
                    >
                        {middleCategoryName}
                    </span>
                    {" > "}
                    Parent Categories
                </div>
                    <div className="page-header">
                        <h1 className="page-title">
                            Parent Categories
                        </h1>
                       <button
                            className="create-btn"
                            onClick={() => setShowModal(true)}
                        >
                            + Create Parent Category
                        </button>
                    </div>

                    <div className="category-card">
                        <table className="category-table">
                            <thead>
                                <tr>
                                    <th> Parent Category Name</th>
                                    <th> Actions </th>
                                </tr>
                            </thead>
                            <tbody>
                            {parentCategories.length === 0 ? (
                                <tr>
                                    <td>No Parent Categories Available</td>
                                    <td></td>
                                </tr>
                                ) : (
                                    parentCategories.map((category)=>(
                                        <tr key={category.id}>
                                            <td> {category.parentCategoryName} </td>
                                            <td>
                                               <button
                                                className="view-btn"
                                                onClick={() =>
                                                    navigate(`/category/${category.id}`, {
                                                        state:{
                                                            topCategoryName,
                                                            middleCategoryId,
                                                            middleCategoryName,
                                                            parentCategoryId: category.id,
                                                            parentCategoryName: category.parentCategoryName
                                                        }
                                                    })
                                                }
                                            >
                                                View
                                            </button>
                                                <button
                                                    className="edit-btn"
                                                    onClick={() => handleEditParentCategory(category)}
                                                >
                                                    Edit
                                                </button>

                                               <button
                                                    className="delete-btn"
                                                    onClick={() => handleDeleteParentCategory(category.id)}
                                                >
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
                        <h2> Create Parent Category </h2>
                        <div className="form-group">
                            <label> Parent Category Name</label>

                            <input
                                type="text"
                                value={parentCategoryName}
                                onChange={(e)=>
                                    setParentCategoryName(e.target.value)
                                }
                                placeholder="Enter Parent Category Name"
                            />
                        </div>
                        <div className="modal-buttons">
                            <button
                                className="cancel-btn"
                                onClick={()=>{
                                    setShowModal(false);
                                    setParentCategoryName("");
                                }}
                            >
                                Cancel
                            </button>

                           <button
                                className="save-btn"
                                onClick={
                                    editMode
                                    ? handleUpdateParentCategory
                                    : handleSaveParentCategory
                                }
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
       </div>
    );
}