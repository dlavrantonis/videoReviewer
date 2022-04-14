import * as React from "react";

interface FileProps {
    name: string;
    callback:(x:string)=>void;
}

const File = (name:any, callback:any) => {
    return <li key={name} onClick={()=>{console.log("click:"+name);callback(name)}}>{name}</li>;
};

export default File;