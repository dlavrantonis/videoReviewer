import * as React from "react";
import { useState, useContext, useEffect } from "react";
import { ExplorerContext } from "../contexts/ExplorerContext";
import File from './File';

interface FolderProps {
    name: string;
    path: string[];
}

const Folder = ({ path, name }: FolderProps) => {
    const explorerContext = useContext(ExplorerContext);
    const files = explorerContext.getChildren(path);
    const [showChildren, setShowChildren] = useState(true);
    var firstName:string =""
    useEffect(() => {
        console.log(" useEffect")
        return () => { if (showChildren) explorerContext.open(path); };
    }, []);

    let fileListing = <span>Loading...</span>;
    if (files != null && files.length>0) {
        console.log(" files:"+JSON.stringify(files))
        console.log(" files[0].name:"+files[0].name)

        
        fileListing = <ul>
            {files.sort().map((file,index) => {
                const filepath = [...path, file.name];
                if (file.isFolder) {
                    return <Folder key={filepath.join('/')} path={filepath} name={file.name} />;
                } else {
                    firstName = index==0?file.name:''
                    return File(file.name, explorerContext.startVideo);
                }
            })}
        </ul>;

        if (!files.length) {
            fileListing = <ul><li><em>Empty folder</em></li></ul>;
        }
    }
    console.log("Folder:"+name)

    return <li>
        <strong onClick={() => {
            console.log("Folder onClick:"+path)
            setShowChildren(!showChildren);
            if (showChildren) {
                console.log("Folder onClick close:"+path)

                explorerContext.close(path);
            } else {
                console.log("Folder onClick open:"+path)

                explorerContext.open(path);
            }
        }}>{name}</strong>
        {showChildren && fileListing}
    </li>;
};

export default Folder;