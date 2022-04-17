import * as React from "react";
import { useState, createContext, useContext, useRef, useEffect } from "react";
import { FileEvent } from "../../shared/types/FileEvent";
import { TreeNode } from "../types/TreeNode";
import type { FileInfo } from '../types/FileInfo';
import ReactPlayer from 'react-player'



const ExplorerContext = createContext({ 
    getChildren: (path: string[]): null | FileInfo[] => null, 
    open: (path: string[]) => { }, 
    close: (path: string[]) => { }, 
    roots: new Array<string>(),
    startVideo: (video:string) =>{}
});

const ExplorerProvider = ({ children }: React.PropsWithChildren<{}>) => {
    const [tree, setTree] = useState<TreeNode>({});
    const [opened, setOpened] = useState(new Map<string, number>());
    const [roots, setRoots] = useState<string[]>([]);
    const [status, setStatus] = useState(-1);
    const [videoFilePath, setVideoFilePath] = useState("");


        

    const wsRef = useRef<WebSocket|null>(null);
    const ws = wsRef.current;
    var firstVideo:string = ""

    function cleanup()
    {
        console.log("cleanup")
        ws?.close()
    }

    function connect() {

        if (!ws || ws.readyState == WebSocket.CLOSED) {
            var wsurl = ""
            wsurl = "wss://dlavrantonisserver.duckdns.org/files"
            //wsurl = "ws://dlavrantonisserver.duckdns.org:3001/files"
            wsRef.current = new WebSocket(wsurl);
            console.log("connecting to:"+wsurl)
            setStatus(WebSocket.CONNECTING);
            wsRef.current.onclose = () => {
                console.log("ws onclose")

                // clear state
                setTree({});
                setRoots([]);
                setOpened(new Map());
                setStatus(WebSocket.CLOSED);
            };
            wsRef.current.onopen = () => {
                console.log("CONNECTED");
                setInterval(()=>{
                    wsRef.current?.send("{\"type\":\"ping\"}");
                },10000);            
                setStatus(WebSocket.OPEN)
            };
        }
    }

    useEffect(() => {
        console.log("useEffect ExplorerContext")
        connect();
       // return cleanup
    }, []);

    switch (status) {
        case WebSocket.CLOSED: return <h2 onClick={connect}>Connection Closed. Click to Reconnect.</h2>;
        case WebSocket.CONNECTING: return <h2>Connecting...</h2>;
        case WebSocket.OPEN: console.log("status is OPEN");break;
        default: return <h2>Not Connected Yet</h2>;
    }

    function handleFileEvent(fileEvent: FileEvent) {
        console.log("handleFileEvent msg:"+JSON.stringify(fileEvent))

        const { eventType, filename, pathname } = fileEvent;
        //console.log(" pathname:"+pathname)
        //console.log(" filename:"+filename)
        //console.log(" eventType:"+eventType)
        if (eventType=="ping")
            return;

        const path = [...pathname.split("/").filter(p => p), filename];
        //(" path:"+path)

        let pointer = tree;
        
        while (path.length > 1) {
            let nextChild = path.shift();
            //console.log(" path2:"+path)
            if (nextChild)
            {
                let next = pointer[nextChild];
                if (!next) {
                    pointer[nextChild] = {};
                    next = pointer[nextChild];
                }
                if (next == "FILE") throw new Error("File nested in file. Impossible.");
                pointer = next;
            }
        }
        //console.log(" path3:"+path)

        switch (eventType) {
            case "file":
                let name1 = path.shift();
                console.log("switch file:"+name1)
                if (name1)
                {
                    pointer[name1] = "FILE";
                    firstVideo = firstVideo.length==0?name1:''

                }
                break;
            case "root":
                console.log(" roots.push(pathname):"+pathname)

                roots.push(pathname);
                setRoots([...roots]);
                //open([...pathname.split("/").filter(p => p), filename])
                break;
            case "folder":
                let name = path.shift();
                if (name)
                    pointer[name] = pointer[name] || {};
                break;
            case "unlink":
                close(path);
                let name2 = path.shift();
                if (name2)
                    delete pointer[name2];
                break;
            // Folder is empty, nothing to do
            case "empty":
                break;
        }


        setTree({ ...tree });
    }

    if (!ws)
        return (<div>dddd</div>)

    ws.onmessage = (messageJson) => {
        console.log("incoming msg:"+JSON.stringify(messageJson))
        const message = JSON.parse(messageJson.data) as FileEvent | FileEvent[];
        console.log("incoming msg11:"+JSON.stringify(message))

        if (Array.isArray(message)) {
            for (let m of message) {
                handleFileEvent(m);
            }
            //console.log("incoming message[0].filename:"+message[0].filename)

            if(message[0].filename){setVideoFilePath(message[0].filename)}

        } else {
            handleFileEvent(message);
            //console.log("incoming message.filename:"+message.filename)

            if (message.filename){setVideoFilePath(message.filename)}
        }

    };


    const startVideo = (video:string) =>{
        console.log(" startVideo:"+video)
        setVideoFilePath(video)
    }

    const getChildren = (path: Readonly<string[]>) => {
        const pathname = "/" + path.join("/");
        if (!opened.has(pathname)) {
            return null;
        }
        let pointer: TreeNode = tree;
        let directions = [...path];
        while (directions.length) {
            var index  = directions.shift()
            if (index)
            {
                const next = pointer[index];
                if (next == "FILE" || next == null) return null;
                pointer = next;
            }

        }
        return Object.entries(pointer).map(([name, value]): FileInfo => {
            return {
                name,
                isFolder: value !== "FILE"
            };
        }).sort((a, b) => a.name.toLocaleLowerCase().localeCompare(b.name.toLowerCase()));
    };

    const close = (path: string[]) => {
        console.log(" close:"+path)

        if (!ws)
            return
        const pathname = "/" + path.join("/");
        if (!opened.has(pathname)) {
            return;
        }
        const watchers = opened.get(pathname);
        if (!watchers)
            return
        opened.set(pathname, watchers - 1);

        if (watchers > 1) return;
        ws.send(JSON.stringify({
            type: "close",
            pathname: pathname
        }));
        opened.delete(pathname);
        setOpened(new Map(opened));
    };
    const open = (path: string[]) => {
        console.log(" open:"+path)

        const pathname = "/" + path.join("/");
        const watchers = opened.get(pathname) || 0;
        opened.set(pathname, watchers + 1);
        setOpened(new Map(opened));

        if (!ws)
        {
            console.log("ws is null!!")
            return
        }
            

        // Subscribe, but only if first watcher
        if (watchers == 0)
        {
            console.log("watchers ==0 sending:"+JSON.stringify({
                type: "open",
                pathname: pathname
            }))

            ws.send(JSON.stringify({
                type: "open",
                pathname: pathname
            }));
        }
        else
        {
            console.log("watchers >0")
        }

    };
    
    var videoPlayer


    return (
    <div>
        <h2>Video Alerts</h2>
        {videoFilePath.length==0?
        null        
        :
        <ReactPlayer   ref={player => { videoPlayer = player }}  url={"Review/"+videoFilePath} playing={true} controls={true}  config={{ file: { attributes: {crossorigin: 'anonymous' }}}}/>
        }
        <ExplorerContext.Provider value={{ getChildren, open, close, roots,startVideo }}>
            {children}
        </ExplorerContext.Provider>
    </div>
)
    
    ;
};

export { ExplorerContext, ExplorerProvider };
