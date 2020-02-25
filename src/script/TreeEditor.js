const NS_SVG = "http://www.w3.org/2000/svg";
const GROUP_BASE_ID = "group-";
const LINK_BASE_ID = "link_";
const ANCHOR_BASE_ID = "anchor-";
const SEGMENT_BASE_ID = "segment_";
const BLOCK_MAX_WIDTH = 88;
const BLOCK_MAX_HEIGHT = 35;

let wysihtml_functions = [
    {
        "command":"bold",
        "title":"CTRL+B",
        "icon":"format_bold",
        "rules":
        {
            "tags":{"b": 1}
        }
    },
    {
        "command":"italic",
        "title":"CTRL+I",
        "icon":"format_italic",
        "rules":
        {
            "tags":{"i": 1}
        }
    },
    "spacer",
    {
        "command":"justifyLeft",
        "title":"Aligner à gauche",
        "icon":"format_align_left",
        "rules":
        {
            "classes": {"wysiwyg-text-align-left": 1},
            "tags":{"div":1}
        }
    },
    {
        "command":"justifyCenter",
        "title":"Centrer",
        "icon":"format_align_center",
        "rules":
        {
            "classes": {"wysiwyg-text-align-center": 1},
            "tags":{"div":1}
        }
    },
    {
        "command":"justifyRight",
        "title":"Aligner à droite",
        "icon":"format_align_right",
        "rules":
        {
            "classes": {"wysiwyg-text-align-right": 1},
            "tags":{"div":1}
        }
    },
    "spacer",
    {
        "command":"insertUnorderedList",
        "title":"Insérer une liste",
        "icon":"format_list_bulleted",
        "rules":
        {
            "tags":{"ul": 1,"li":1}
        }
    },
    {
        "command":"insertOrderedList",
        "title":"Insérer une liste ordonnée",
        "icon":"format_list_numbered",
        "rules":
        {
            "tags":{"ol": 1,"li":1}
        }
    }
];

let type_list = {
    "diagnostic":"D&eacute;marche diagnostique",
    "reflexion": "&Eacute;valuation",
    "treatment": "Traitement"
};
let grade_list = {
    "Grade A":"Grade A",
    "Grade B":"Grade B",
    "Grade C":"Grade C",
    "AE":"AE"
};
let note_list = {
    "1":"1",
    "2":"2",
    "3":"3",
    "4":"4",
    "5":"5",
    "6":"6",
    "7":"7",
    "8":"8"
};

let wysihtmlParserRules = {"tags":{"br":1}};

wysihtml_functions.forEach(function(pRule){
    let r, k;
    for(let i in pRule.rules)
    {
        if(!pRule.rules.hasOwnProperty(i))
            continue;
        if(!wysihtmlParserRules[i])
            wysihtmlParserRules[i] = {};
        r = pRule.rules[i];
        for(k in r)
        {
            if(!r.hasOwnProperty(k))
                continue;
            wysihtmlParserRules[i][k] = r[k];
        }
    }

});

function Draggable(pElement, pTreeEditor)
{
    this._setupDraggable(pElement, pTreeEditor);
}

Class.define(Draggable, [EventDispatcher], {
    _setupDraggable:function(pElement, pTreeEditor)
    {
        this.removeAllEventListener();
        this.treeEditor = pTreeEditor;
        this.element = pElement;
        this.element.classList.add("draggable");
        this.options = this._parseOptions(this.element.getAttribute("data-draggable"));
        this.relativePointer = {x:0, y:0};
        this.element.addEventListener("mousedown", this._startDragHandler.proxy(this), false);
        this.element.addEventListener("mouseup", this._selectHandler.proxy(this), false);
        this.__dropHandler = this._dropHandler.proxy(this);
        this.__dragHandler = this._dragHandler.proxy(this);
        if(this.options.restraintTo)
        {
            this.treeEditor.dispatchers[this.options.restraintTo[0]].addEventListener(InteractiveEvent.BOUNDS_CHANGED, this._updateConstraint.proxy(this), false);
            this.treeEditor.dispatchers[this.options.restraintTo[0]].addEventListener(InteractiveEvent.REMOVED, this.remove.proxy(this), false);
            this._updateConstraint();
        }
    },
    _selectHandler:function(e)
    {
        if(e && !e.ctrlKey && !DragSelector.isSelected(this))
            this.treeEditor.deselectAll();
        DragSelector.select(this);
    },
    _startDragHandler:function(e)
    {
        if(this.treeEditor.contentMode())
            return;
        let p = this.treeEditor.getRelativePositionFromSVG(e.clientX, e.clientY);
        this.relativePointer.x = p.x - this.getX();
        this.relativePointer.y = p.y - this.getY();
        document.addEventListener("mouseup", this.__dropHandler, false);
        document.addEventListener("mousemove", this.__dragHandler, false);
    },
    _dropHandler:function()
    {
        document.removeEventListener("mouseup", this.__dropHandler, false);
        document.removeEventListener("mousemove", this.__dragHandler, false);
        this.dispatchEvent(new Event(InteractiveEvent.BOUNDS_CHANGED));
    },
    _dragHandler:function(e)
    {
        let p = this.treeEditor.getRelativePositionFromSVG(e.clientX, e.clientY);
        p = {x: p.x - this.relativePointer.x, y: p.y - this.relativePointer.y};
        this.setPosition(p.x, p.y);
    },
    _parseOptions:function(pString)
    {
        if(!pString)
            return {};

        let options = {};

        let opts = pString.split(";");

        let o, name, params;
        for(let i = 0, max = opts.length; i<max;i++)
        {
            o = opts[i];
            name = o.split(":");
            params = name[1]||"";
            name = name[0];
            options[name] = params.split(",");
        }

        return options;
    },
    _updateOptions:function()
    {
        let strOpt = [], opt;
        for(let i in this.options)
        {
            if(!this.options.hasOwnProperty(i))
                continue;
            opt = i+":"+this.options[i].join(",");
            strOpt.push(opt);
        }
        this.element.setAttribute("data-draggable", strOpt.join(";"));
    },
    _updateConstraint:function()
    {
        let restraint = this.options.restraintTo;
        let rPosition = this.treeEditor.dispatchers[restraint[0]].getRelativePosition(restraint[1]||"50%", restraint[2]||"50%");
        this.setPosition(rPosition.x, rPosition.y);
    },
    remove:function()
    {
        let id = this.element.getAttribute("id");
        if(!this.element.parentNode)
            return;
        this.element.parentNode.removeChild(this.element);
        this.treeEditor.dispatchers[id].dispatchEvent(new Event(InteractiveEvent.REMOVED));
        this.removeAllEventListener();
        this.treeEditor.dispatchers[id] = null;
        delete this.treeEditor.dispatchers[id];
    },
    setPosition:function(pX, pY)
    {
        let restraint = this.options.restraintTo;
        pX = Math.max(pX, 0);
        pY = Math.max(pY, 0);
        pX = Math.min(pX, this.treeEditor.svg.getBoundingClientRect().width - this.getWidth());
        pY = Math.min(pY, this.treeEditor.svg.getBoundingClientRect().height- this.getHeight());
        if(restraint)
        {
            let t = this.treeEditor.dispatchers[restraint[0]];

            pX = Math.max(t.getX(), pX);
            pX = Math.min(t.getX() + t.getWidth(), pX);
            pY = Math.max(t.getY(), pY);
            pY = Math.min(t.getY() + t.getHeight(), pY);
            let newRestraint = {x:(Math.round(((pX - t.getX()) / t.getWidth())*1000)/10)+"%", y:(Math.round(((pY - t.getY()) / t.getHeight()) * 1000)/10)+"%"};
            if(["left", "right"].indexOf(restraint[1])>-1)
            {
                if(restraint[1] === "left")
                {
                    pX = t.getX();
                }
                else
                {
                    pX = t.getX()+t.getWidth();
                }
                newRestraint.x = restraint[1];
            }
            else if (["top", "bottom"].indexOf(restraint[2])>-1)
            {
                if(restraint[2] === "top")
                {
                    pY = t.getY();
                }
                else
                {
                    pY = t.getY()+t.getHeight();
                }
                newRestraint.y = restraint[2];
            }

            this.options.restraintTo[1] = newRestraint.x;
            this.options.restraintTo[2] = newRestraint.y;
            this._updateOptions();
        }
        this.element.setAttribute("transform", "translate("+Math.round(pX)+","+Math.round(pY)+")");
        this.dispatchEvent(new Event(InteractiveEvent.BOUNDS_CHANGED));
    },
    move:function(pVectorX, pVectorY)
    {
        this.setPosition((this.getX())+pVectorX, (this.getY())+pVectorY);
    },
    getStringPosition:function()
    {
        if(this.options.restraintTo)
        {
            return "restraintTo:"+this.options.restraintTo.join(",");
        }
        return this.getX()+","+this.getY();
    },
    setX:function(pX)
    {
        this.setPosition(pX, this.getY());
    },
    setY:function(pY)
    {
        this.setPosition(this.getX(), pY);
    },
    getX:function()
    {
        return TreeEditor.UTILS.getTranslateXValue(this.element);
    },
    getY:function()
    {
        return TreeEditor.UTILS.getTranslateYValue(this.element);
    },
    getWidth:function()
    {
        let t = this.element.getBoundingClientRect();
        return Number(t.width)||0;
    },
    getHeight:function()
    {
        let t = this.element.getBoundingClientRect();
        return Number(t.height)||0;
    },
    getRelativePosition:function(pLeft, pTop)
    {
        let left = 0;
        let top = 0;

        switch(pLeft)
        {
            case "left":
                break;
            case "right":
                left = 1;
                break;
            default:
                left = Number(pLeft.replace("%", "")) / 100;
                break;
        }

        switch(pTop)
        {
            case "top":
                break;
            case "bottom":
                top = 1;
                break;
            default:
                top = Number(pTop.replace("%", "")) / 100;
                break;
        }

        return {
            x: this.getX()+(left * this.getWidth()),
            y: this.getY()+(top * this.getHeight())
        };
    },
    checkOverlap:function(pRect)
    {
        if(!this.isSelectable())
            return;

        let left1 = (this.getX());
        let right1 = (this.getX())+this.getWidth();
        let top1 = (this.getY());
        let bottom1 = (this.getY())+this.getHeight();

        let left2 = pRect.x;
        let right2 = pRect.x+pRect.width;
        let top2 = pRect.y;
        let bottom2 = pRect.y+pRect.height;

        return (left1<right2 && left2<right1 && top1<bottom2 && top2 < bottom1);
    },
    isSelectable:function()
    {
        return !this.options.restraintTo;
    }
});

let InteractiveEvent = {
    BOUNDS_CHANGED: "evt_bounds_changed",
    REMOVED: "evt_removed",
    SPLIT: "evt_split"
};

function Resizable(pElement, pTreeEditor)
{
    this._setupResizable(pElement, pTreeEditor);
}

Class.define(Resizable, [Draggable], {
    _setupResizable:function(pElement, pTreeEditor)
    {
        this.__resizeHandler = this._resizeHandler.proxy(this);
        this.__resizedHandler = this._resizedHandler.proxy(this);
        pElement.addEventListener("mousedown", this._downHandler.proxy(this), false);

        this._setupDraggable(pElement, pTreeEditor);
        if(!this.element.querySelector('path[data-role="resize"]'))
            SVGElement.create("path", {"d":"M10,0 L10,10 L0,10 Z", "transform":"translate("+(this.getWidth()-15)+", "+(this.getHeight()-15)+")", "fill":"#000", "data-role":"resize"}, this.element);
    },
    _downHandler:function(e)
    {
        if(this.treeEditor.contentMode())
            return;

        let t = e.target;

        if(t.getAttribute("data-role") && t.getAttribute("data-role") === "resize")
        {
            e.stopPropagation();
            e.stopImmediatePropagation();
            let p = this.treeEditor.getRelativePositionFromSVG(e.clientX, e.clientY);
            this.relativePointer.x = p.x - this.getX();
            this.relativePointer.y = p.y - this.getY();
            this.startDimensions = {width:this.getWidth(), height:this.getHeight()};
            document.addEventListener("mouseup", this.__resizedHandler, false);
            document.addEventListener("mousemove", this.__resizeHandler, false);
        }
    },
    _resizeHandler:function(e)
    {
        let p = this.treeEditor.getRelativePositionFromSVG(e.clientX, e.clientY);
        let newPosition = {
            x: p.x - this.getX(),
            y: p.y - this.getY()
        };

        let diff = {
            x: newPosition.x - this.relativePointer.x,
            y: newPosition.y - this.relativePointer.y
        };

        if(e.shiftKey)
        {
            let max = Math.max(diff.x, diff.y);
            diff.x = max;
            diff.y = max;
        }

        let newDimensions = {
            width:this.startDimensions.width + diff.x,
            height:this.startDimensions.height + diff.y
        };

        this.setDimensions(newDimensions.width, newDimensions.height);
    },
    _resizedHandler:function(e)
    {
        document.removeEventListener("mouseup", this.__resizedHandler, false);
        document.removeEventListener("mousemove", this.__resizeHandler, false);
        this.dispatchEvent(new Event(InteractiveEvent.BOUNDS_CHANGED));
    },
    setDimensions:function(pWidth, pHeight)
    {
        pWidth = Math.max(pWidth, BLOCK_MAX_WIDTH);
        pHeight = Math.max(pHeight, BLOCK_MAX_HEIGHT);
        let rect = this.element.querySelector("rect");
        rect.setAttribute("width", Math.round(pWidth));
        rect.setAttribute("height", Math.round(pHeight));
        let resizer = this.element.querySelector('path[data-role="resize"]');
        resizer.setAttribute("transform", "translate("+(pWidth-15)+", "+(pHeight-15)+")");
        this.dispatchEvent(new Event(InteractiveEvent.BOUNDS_CHANGED));
    },
    getDimensions:function()
    {
        let rect = this.element.querySelector("rect");
        return {width:Number(rect.getAttribute("width")), height:Number(rect.getAttribute("height"))};
    }
});

function Block(pElement, pTreeEditor)
{
    this._setupResizable(pElement, pTreeEditor);
    this.element.addEventListener("click", this.select.proxy(this), false);
    this.previous = {};
    this.next = {};
    this.collections = [new ElementCollection("notes", this, "left,bottom", pTreeEditor),new ElementCollection("grades", this, "right-18,bottom", pTreeEditor)];
    this.addEventListener(InteractiveEvent.BOUNDS_CHANGED, this._sizedUpdatedHandler.proxy(this), false);
}

Class.define(Block,[Resizable], {
    select:function()
    {
        this.treeEditor.propertiesEditor.edit(this);
    },
    setProperty:function(pName, pValue)
    {
        let dim;
        switch(pName)
        {
            case "description":
                pValue = pValue.replace(/\n/g, "<br/>");
                this.element.querySelector('foreignObject div[data-name="'+pName+'"]').innerHTML = pValue;
                break;
            case "type":
                this.element.setAttribute("data-type", pValue);
                break;
            case "add_grades":
                if(!grade_list[pValue])
                    return;
                if(pValue !== "none")
                {
                    this.collections[1].addElement(grade_list[pValue]);
                    this.select();
                }
                break;
            case "add_notes":
                if(!note_list[pValue])
                    return;
                if(pValue !== "none")
                {
                    this.collections[0].addElement(note_list[pValue]);
                    this.select();
                }
                break;
            case "newLink":
                if(pValue !== "none")
                {
                    this.treeEditor.toggleHighlightBlock(pValue, "remove");
                    this.treeEditor.createLink(this.element.getAttribute("id"), pValue);
                    this.select();
                }
                break;
            case "width":
                if(pValue !== "" && pValue > 0)
                {
                    dim = this.getDimensions();
                    this.treeEditor.animate(this, "width", dim.width, pValue, 1, function(pDummy, pContext){
                        pContext.setDimensions(Number(pDummy.value), dim.height);
                    });
                }
                break;
            case "height":
                if(pValue !== "" && pValue > 0)
                {
                    dim = this.getDimensions();
                    this.treeEditor.animate(this, "height", dim.height, pValue, 1, function(pDummy, pContext){
                        pContext.setDimensions(dim.width, Number(pDummy.value));
                    });
                }
                break;
            default:
                console.log("Block::setProperty('"+pName+"', '"+pValue+"');");
                break;
        }
    },
    getEditableProperties:function()
    {
        let properties = {
            "type": {
                "label":"Type de block",
                "mode":[TreeEditor.DESIGN_MODE,TreeEditor.CONTENT_MODE],
                "type":"select",
                "data":type_list,
                "value":this.element.getAttribute("data-type")
            },
            "description": {
                "label":"Contenu",
                "type":"html",
                "mode":[TreeEditor.CONTENT_MODE],
                "value":this.element.querySelector('foreignObject div[data-name="description"]').innerHTML
            },
            "width": {
                "label":"Largeur",
                "mode":[TreeEditor.DESIGN_MODE],
                "type":"number",
                "value":this.getDimensions().width
            },
            "height": {
                "label":"Hauteur",
                "mode":[TreeEditor.DESIGN_MODE],
                "type":"number",
                "value":this.getDimensions().height
            }
        };

        let collections = [{"labelList":"Note", "name":"notes", "method":"removeNote", "availableList":note_list, "labelDefaultAdd":"Sélectionner une note", "labelAdd":"Ajouter une note"},
            {"labelList":"Grade", "name":"grades", "method":"removeGrade", "availableList":grade_list, "labelDefaultAdd":"Sélectionner un grade", "labelAdd":"Ajouter un grade"}];
        let coll, dList, selectedData, value, i, max, ignore, addList, j, has_options;
        for(let k = 0, maxk = collections.length; k<maxk; k++)
        {
            coll = collections[k];
            dList = {};
            ignore = [];
            selectedData = this.collections[k].getSelectedElements();
            for(i = 0, max = selectedData.length;i<max;i++)
            {
                value = selectedData[i];
                dList[value] = {"label":value, "extra":value, "title":value, "method":coll.method};
                ignore.push(value);
            }

            if(max > 0)
            {
                properties[coll.name] = {
                    "label":coll.labelList+(max>1?"s":""),
                    "mode":[TreeEditor.CONTENT_MODE],
                    "type":"list",
                    "data":dList
                };
            }

            has_options = false;

            addList = {"none":coll.labelDefaultAdd};
            for(j in coll.availableList)
            {
                if(!coll.availableList.hasOwnProperty(j))
                    continue;
                value = coll.availableList[j];
                if(ignore.indexOf(value) !== -1)
                    continue;
                has_options = true;
                addList[value] = value;
            }

            if(has_options)
            {
                properties["add_"+coll.name] = {
                    "label":coll.labelAdd,
                    "mode":[TreeEditor.CONTENT_MODE],
                    "type":"select",
                    "data":addList
                };
            }

        }

        let hasNext = false;
        let next = {};
        let bl, label, title;
        for(i in this.next)
        {
            if(!this.next.hasOwnProperty(i))
                continue;
            bl = this.treeEditor.dispatchers[i];
            title = bl.element.querySelector('foreignObject div[data-name="description"]').textContent;
            label = title;
            if(label.length>30)
                label = label.substr(0, 27)+"...";
            next[i] = {"label":label, "extra":this.next[i], "title":title, "method":"removeLink", "overHandler":this.toggleHighlightBlockFromLink.proxy(this), "outHandler":this.toggleHighlightBlockFromLink.proxy(this)};
            hasNext = true;
        }
        if(hasNext)
        {
            properties.next = {
                "label":"Liens sortants",
                "mode":[TreeEditor.DESIGN_MODE,TreeEditor.CONTENT_MODE],
                "type":"list",
                "data":next
            };
        }

        ignore = [this.element.getAttribute("id")].concat(this.getLinkedBlocks());
        has_options = false;
        let further_blocks = {"none":{"label":"Sélectionner un block"}};
        for(i in this.treeEditor.dispatchers)
        {
            if(!this.treeEditor.dispatchers.hasOwnProperty(i)||ignore.indexOf(i)>-1)
                continue;
            title = this.treeEditor.dispatchers[i].element.querySelector('foreignObject *[data-name="description"]');
            if(!title)
                continue;
            title = title.textContent;
            if(title.length>30)
                title = title.substr(0, 27)+"...";
            further_blocks[this.treeEditor.dispatchers[i].element.getAttribute("id")] = {"label":title,"overHandler":this.toggleHighlightBlock.proxy(this), "outHandler":this.toggleHighlightBlock.proxy(this)};
            has_options = true;
        }

        if(has_options)
        {
            properties.newLink = {
                "label":"Ajouter un lien vers",
                "mode":[TreeEditor.DESIGN_MODE, TreeEditor.CONTENT_MODE],
                "type":"combobox",
                "data":further_blocks
            };
        }

        return properties;
    },
    toggleHighlightBlock:function(e)
    {
        let current_link_id = e.currentTarget.getAttribute("data-combobox-value");
        let method = e.type === "mouseover"?"add":"remove";
        this.treeEditor.toggleHighlightBlock(current_link_id, method);
    },
    toggleHighlightBlockFromLink:function(e)
    {
        let current_link_id = e.currentTarget.querySelector("span.remove").getAttribute("data-remove");
        let method = e.type === "mouseover"?"add":"remove";
        let link_id;
        for(let i in this.next)
        {
            if(!this.next.hasOwnProperty(i))
                continue;
            link_id = this.next[i];

            if(link_id === current_link_id)
            {
                this.treeEditor.toggleHighlightBlock(i, method);
                return;
            }
        }
    },
    nextBlockRemovedHandler:function(e){
        let id = e.currentTarget.element.getAttribute("id");
        this.next[id] = null;
        delete this.next[id];
    },
    previousBlockRemovedHandler:function(e){
        let id = e.currentTarget.element.getAttribute("id");
        this.previous[id] = null;
        delete this.previous[id];
    },
    removeGrade:function(pGrade)
    {
        this.collections[1].removeElement(pGrade);
    },
    removeNote:function(pNote)
    {
        this.collections[0].removeElement(pNote);
    },
    removeLink:function(pLink)
    {
        for(let i in this.next)
        {
            if(!this.next.hasOwnProperty(i))
                continue;
            if(this.next[i] === pLink)
            {
                this.treeEditor.toggleHighlightBlock(i, "remove");
                this.next[i] = null;
                delete this.next[i];
                this.treeEditor.links[pLink].remove();
            }
        }
    },
    addPreviousBlock:function(pId, pLine)
    {
        for(let i in this.previous)
        {
            if(i === pId)
                return;
        }
        this.previous[pId] = pLine;
        this.treeEditor.dispatchers[pId].addEventListener(InteractiveEvent.REMOVED, this.previousBlockRemovedHandler.proxy(this), false);
    },
    addNextBlock:function(pId, pLine)
    {
        for(let i in this.next)
        {
            if(i === pId)
                return;
        }
        this.next[pId] = pLine;
        this.treeEditor.dispatchers[pId].addEventListener(InteractiveEvent.REMOVED, this.nextBlockRemovedHandler.proxy(this), false);
    },
    getLinkedBlocks:function()
    {
        let linked = [];
        for(let k in this.next)
        {
            if(!this.next.hasOwnProperty(k))
                continue;
            linked.push(k);
        }
        for(let k in this.previous)
        {
            if(!this.previous.hasOwnProperty(k))
                continue;
            linked.push(k);
        }
        return linked;
    },
    _sizedUpdatedHandler:function()
    {
        let fo = this.element.querySelector("foreignObject");
        if(!fo)
            return;

        let rectDimensions = this.getDimensions();

        fo.setAttribute("width", Math.max(rectDimensions.width - 20, 0));
        fo.setAttribute("height", Math.max(rectDimensions.height - 20, 0));
    }
});

function Anchor(pId, pPosition, pTreeEditor)
{
    this.radius = 10;
    let opt = {
        "r":this.radius,
        "id":pId,
        "data-role":"block",
        "class":"anchor"
    };
    if(pPosition)
    {
        if(pPosition.indexOf("restraintTo:")===0)
            opt['data-draggable'] = pPosition;
    }
    this.id = pId;
    this.element = pTreeEditor.svg.querySelector("#"+pId);
    if(!this.element)
        this.element = SVGElement.create("circle", opt, pTreeEditor.svg);
    this._setupDraggable(this.element, pTreeEditor);
    if(pPosition && pPosition.indexOf("restraintTo:")!==0)
    {
        let pos = pPosition.split(",");
        this.setPosition(pos[0], pos[1]);
    }
}

Class.define(Anchor, [Draggable],  {
    share:function()
    {
        this.element.setAttribute("data-shared", "true");
    },
    unShare:function()
    {
        this.element.removeAttribute("data-shared");
    },
    isShared:function()
    {
        return this.element.getAttribute("data-shared") && this.element.getAttribute("data-shared") === "true";
    },
    getDimensions:function()
    {
        return {width:this.radius, height:this.radius};
    }
});

function Segment(pIdAnchor1, pIdAnchor2, pPositionAnchor1, pPositionAnchor2, pTreeEditor)
{
    this.removeAllEventListener();
    this.treeEditor = pTreeEditor;
    this.svg = pTreeEditor.svg;
    let index = pTreeEditor.getNextAnchorIndex();

    this.idAnchor1 = pIdAnchor1||pTreeEditor.generateId(ANCHOR_BASE_ID+index);
    this.idAnchor2 = pIdAnchor2||pTreeEditor.generateId(ANCHOR_BASE_ID+(index+1));

    if(!pIdAnchor1||!this.treeEditor.dispatchers[this.idAnchor1])
        this.treeEditor.dispatchers[this.idAnchor1] = new Anchor(this.idAnchor1, pPositionAnchor1, this.treeEditor);
    else
        this.treeEditor.dispatchers[this.idAnchor1].share();
    if(!pIdAnchor2||!this.treeEditor.dispatchers[this.idAnchor2])
        this.treeEditor.dispatchers[this.idAnchor2] = new Anchor(this.idAnchor2, pPositionAnchor2, this.treeEditor);
    else
        this.treeEditor.dispatchers[this.idAnchor2].share();

    this.id = SEGMENT_BASE_ID+this.idAnchor1+"_"+this.idAnchor2;
    this.element = this.svg.querySelector("#"+this.id);
    if(!this.element)
    {
        this.element = SVGElement.create("line",{
            "id":this.id,
            "class":"segment"
        }, this.svg, this.svg.querySelector("circle.anchor.draggable"));
    }

    if(pPositionAnchor2&&pPositionAnchor2.indexOf("restraintTo:")===0)
    {
        this.element.setAttribute("marker-end", "url(#"+this.svg.querySelector("defs>marker").getAttribute("id")+")");
    }

    this.element.addEventListener("dblclick", this._doubleClickHandler.proxy(this), false);

    this.anchor1  = this.treeEditor.dispatchers[this.idAnchor1];
    this.anchor2 = this.treeEditor.dispatchers[this.idAnchor2];

    this.__updatePositionHandler = this._updatePositionHandler.proxy(this);
    this._anchor1RemovedHandler = this.anchor1Removed.proxy(this);
    this._anchor2RemovedHandler = this.anchor2Removed.proxy(this);

    this.anchor1.addEventListener(InteractiveEvent.BOUNDS_CHANGED, this.__updatePositionHandler, false);
    this.anchor1.addEventListener(InteractiveEvent.REMOVED, this._anchor1RemovedHandler, false);
    this.anchor2.addEventListener(InteractiveEvent.BOUNDS_CHANGED, this.__updatePositionHandler, false);
    this.anchor2.addEventListener(InteractiveEvent.REMOVED, this._anchor2RemovedHandler, false);
    this._updatePositionHandler();
}

Class.define(Segment, [EventDispatcher], {
    _doubleClickHandler:function(e)
    {
        if(this.treeEditor.contentMode())
            return;

        this.splitInfo = this.treeEditor.getRelativePositionFromSVG(e.clientX, e.clientY);
        this.dispatchEvent(new Event(InteractiveEvent.SPLIT));
    },
    _updatePositionHandler:function(e)
    {
        this.element.setAttribute("x1", this.anchor1.getX());
        this.element.setAttribute("y1", this.anchor1.getY());
        this.element.setAttribute("x2", this.anchor2.getX());
        this.element.setAttribute("y2", this.anchor2.getY());
    },
    remove:function(e)
    {
        let id = this.element.getAttribute("id");
        if(!this.element.parentNode)
            return;
        this.element.parentNode.removeChild(this.element);
        if(this.anchor1)
        {
            this.anchor1.removeEventListener(InteractiveEvent.BOUNDS_CHANGED, this.__updatePositionHandler, false);
            this.anchor1.removeEventListener(InteractiveEvent.REMOVED, this._anchor1RemovedHandler, false);
            if(!this.anchor1.isShared())
                this.anchor1.remove();
            else
                this.anchor1.unShare();
        }

        if(this.anchor2)
        {
            this.anchor2.removeEventListener(InteractiveEvent.BOUNDS_CHANGED, this.__updatePositionHandler, false);
            this.anchor2.removeEventListener(InteractiveEvent.REMOVED, this._anchor2RemovedHandler, false);
            if(!this.anchor2.isShared())
                this.anchor2.remove();
            else
                this.anchor2.unShare();
        }
        this.dispatchEvent(new Event(InteractiveEvent.REMOVED));
    },
    anchor1Removed:function(e)
    {
        this.anchor1 = null;
        this.remove(e);
    },
    anchor2Removed:function(e)
    {
        this.anchor2 = null;
        this.remove(e);
    },
    getAnchorsPositions:function()
    {
        let anchor1 = this.anchor1.getStringPosition();
        let anchor2 = this.anchor2.getStringPosition();
        return [anchor1, anchor2];
    }
});

function Link(pFirstBlock ,pSecondBlock, pTreeEditor, pSegments)
{
    this.treeEditor = pTreeEditor;
    this.id = LINK_BASE_ID+pFirstBlock+"_"+pSecondBlock;
    this.treeEditor.links[this.id] = this;
    this.treeEditor.dispatchers[pFirstBlock].addNextBlock(pSecondBlock, this.id);
    this.treeEditor.dispatchers[pSecondBlock].addPreviousBlock(pFirstBlock, this.id);
    this.firstBlock = pFirstBlock;
    this.secondBlock = pSecondBlock;
    this._removeHandler = this.remove.proxy(this);
    this.segments = [];
    if(pSegments)
        this.setSegments(pSegments);
    else
        this.addSegment(null, null, "restraintTo:"+this.firstBlock+","+this.treeEditor.direction.restraints[0], "restraintTo:"+this.secondBlock+","+this.treeEditor.direction.restraints[1]);
}

Class.define(Link, [], {
    remove:function(e)
    {
        let s;
        while(this.segments.length)
        {
            s = this.segments.shift();
            s.removeEventListener(InteractiveEvent.REMOVED, this._removeHandler, false);
            s.remove();
        }
        this.treeEditor.links[this.id] = null;
        delete this.treeEditor.links[this.id];
    },
    splitSegment:function(e)
    {
        let s = e.currentTarget;

        let idAnchor1 = null;
        let idAnchor2 = null;
        let positionAnchor1 = null;
        let positionAnchor2 = null;

        let anchorsPositions = s.getAnchorsPositions();

        if(s.anchor1.isShared())
            idAnchor1 = s.anchor1.id;
        else
            positionAnchor1 = anchorsPositions[0];

        if(s.anchor2.isShared())
            idAnchor2 = s.anchor2.id;
        else
            positionAnchor2 = anchorsPositions[1];

        let splitPosition = (s.splitInfo.x)+","+ (s.splitInfo.y);

        s.removeEventListener(InteractiveEvent.REMOVED, this._removeHandler, false);
        let segments = [];
        for(let i = 0, max = this.segments.length; i<max;i++)
        {
            if(this.segments[i].id !== s.id)
            {
                segments.push(this.segments[i]);
            }
        }
        this.segments = segments;
        s.remove();

        let newSegment = this.addSegment(idAnchor1, null, positionAnchor1, splitPosition);
        this.addSegment(newSegment.idAnchor2, idAnchor2, null, positionAnchor2);
    },
    addSegment:function(pAnchor1, pAnchor2, pPositionAnchor1, pPositionAnchor2)
    {
        let s = new Segment(pAnchor1, pAnchor2, pPositionAnchor1, pPositionAnchor2, this.treeEditor);
        s.addEventListener(InteractiveEvent.REMOVED, this._removeHandler, false);
        s.addEventListener(InteractiveEvent.SPLIT, this.splitSegment.proxy(this), false);
        this.segments.push(s);
        return s;
    },
    setSegments:function(pSegments)
    {
        let s;
        for(let i = 0, max = pSegments.length; i<max; i++)
        {
            s = pSegments[i];
            s.addEventListener(InteractiveEvent.REMOVED, this._removeHandler, false);
            s.addEventListener(InteractiveEvent.SPLIT, this.splitSegment.proxy(this), false);
            this.segments.push(s);
        }
    }
});

function ElementCollection(pType, pParentBlock, pParentAlign, pTreeEditor)
{
    this.treeEditor = pTreeEditor;
    this.type = pType;
    this.groupElement = pParentBlock.element.querySelector('g[data-role="'+pType+'"]');
    if(!this.groupElement)
        this.groupElement = SVGElement.create("g", {"data-role":pType}, pParentBlock.element);
    this.parentBlock = pParentBlock;
    this.parentAlign = pParentAlign;
    this.elements = [];
    this.elementsValues = [];
    let ref = this;
    this.groupElement.querySelectorAll("g").forEach(function(pElement)
    {
        ref.elements.push(pElement);
        ref.elementsValues.push(pElement.querySelector("text").textContent);
    });
    this.updatePosition();
    this._updatePosition = this.updatePosition.proxy(this);
    this.parentBlock.addEventListener(InteractiveEvent.BOUNDS_CHANGED, this._updatePosition);
    this.parentBlock.addEventListener(InteractiveEvent.REMOVED, this.parentRemovedHandler);
    this.treeEditor.addEventListener(TreeEditor.MODE_CHANGED, this.modeChangedHandler.proxy(this));
    this.useMargin = true;
}

Class.define(ElementCollection, [], {
    addElement:function(pLabel)
    {
        if(!ElementCollection[this.type])
            return;
        this.elementsValues.push(pLabel);
        this.elements.push(ElementCollection[this.type](pLabel, this.groupElement));
        this.elements.sort(function(pA, pB)
        {
            let t1 = pA.querySelector("text").textContent;
            let t2 = pB.querySelector("text").textContent;
            if(t1<t2)
                return -1;
            else if (t1>t2)
                return 1;
            return 0;
        });
        let p = this.groupElement;
        this.elements.forEach(function(pElement){
            p.removeChild(pElement);
            p.appendChild(pElement);
        });
        this.updatePosition();
    },
    removeElement:function(pLabel)
    {
        let filtered = [];
        let v;
        for(let i = 0, max = this.elementsValues.length; i<max;i++)
        {
            v = this.elementsValues[i];
            if(v === pLabel)
                continue;
            filtered.push(v);
        }
        this.removeElements();
        for(i = 0, max = filtered.length; i<max;i++)
            this.addElement(filtered[i]);
    },
    removeElements:function()
    {
        this.elements.forEach(function(pElement)
        {
            pElement.parentNode.removeChild(pElement);
        });
        this.elements = [];
        this.elementsValues = [];
        this.updatePosition();
    },
    getSelectedElements:function()
    {
        return this.elementsValues;
    },
    getWidth:function()
    {
        let t = this.groupElement.getBoundingClientRect();
        return Number(t.width)||0;
    },
    getHeight:function()
    {
        let t = this.groupElement.getBoundingClientRect();
        return Number(t.height)||0;
    },
    modeChangedHandler:function()
    {
        this.useMargin = this.treeEditor.editor_mode === TreeEditor.DESIGN_MODE;
        this.updatePosition();
    },
    updatePosition:function()
    {
        let currentX = 0;
        for(let i = 0, max = this.elements.length; i<max; i++)
        {
            this.elements[i].setAttribute("transform", "translate("+currentX+",0)");
            currentX += this.elements[i].getBoundingClientRect().width + 3;
        }
        let alignments = this.parentAlign.split(",");
        let x = 0;
        let y = 0;
        if(alignments.length === 2)
        {
            let marginLeft = alignments[0].replace("right", "").replace("left", "");
            let marginTop = alignments[1].replace("top", "").replace("bottom", "");
            let left = alignments[0].replace(marginLeft, "");
            let top = alignments[1].replace(marginTop, "");
            if(!this.useMargin){
                marginLeft = 0;
                marginTop = 0;
            }
            let parentDimensions = this.parentBlock.getDimensions();
            switch(left)
            {
                case "right":
                    x = parentDimensions.width - this.getWidth();
                    break;
            }
            switch(top)
            {
                case "bottom":
                    y = parentDimensions.height - this.getHeight();
                    break;
            }

            if(marginLeft)
                x += Number(marginLeft);
            if(marginTop)
                y += Number(marginTop);
        }
        this.groupElement.setAttribute("transform", "translate("+x+","+y+")");
    }
});

ElementCollection.grades = function(pLabel, pParent)
{
    let g = SVGElement.create("g", {"data-role":"grade"}, pParent);
    let rect = SVGElement.create("rect", {}, g);
    let label = SVGElement.create("text", {"innerHTML": pLabel, "y":12, "x":2}, g);
    rect.setAttribute("width", label.getBoundingClientRect().width+4);
    rect.setAttribute("height", label.getBoundingClientRect().height);
    return g;
};

ElementCollection.notes = function(pLabel, pParent)
{
    let g = SVGElement.create("g", {"data-role":"note"}, pParent);
    let circle = SVGElement.create("circle", {}, g);
    let label = SVGElement.create("text", {"innerHTML": pLabel}, g);
    let r = Math.max(label.getBBox().width, label.getBBox().height)>>1;
    circle.setAttribute("cx", r);
    circle.setAttribute("cy", r);
    circle.setAttribute("r", r);
    label.setAttribute("x", r - (r>>1)-1);
    label.setAttribute("y", (2*r)-3);
    return g;
};

let SVGElement = {
    create:function(pName, pAttributes, pParentNode, pInsertBefore)
    {
        return Element.create(pName, pAttributes, pParentNode, pInsertBefore, NS_SVG);
    }
};

let Element = {
    create:function(pName, pAttributes, pParentNode, pInsertBefore, pNs)
    {
        let element = pNs?document.createElementNS(pNs, pName):document.createElement(pName);

        for(let i in pAttributes)
        {
            if(!pAttributes.hasOwnProperty(i))
                continue;
            switch(i)
            {
                case "innerHTML":
                    element.innerHTML = pAttributes[i];
                    break;
                default:
                    element.setAttribute(i, pAttributes[i]);
                    break;
            }
        }

        if(pParentNode)
        {
            if(pInsertBefore)
            {
                pParentNode.insertBefore(element, pInsertBefore);
            }
            else
            {
                pParentNode.appendChild(element);
            }
        }

        return element;
    }
};

function PropertiesEditor(pElement, pTreeEditor)
{
    this.treeEditor = pTreeEditor;
    this.element = pElement;
    let normalMove = 1;
    let tiledMove = 15;
    this.rte = [];
    this.treeEditor.keyboardHandler.addShortcut([KeyboardHandler.ESC], this.deselect.proxy(this));
    this.treeEditor.keyboardHandler.addShortcut([KeyboardHandler.LEFT], this.move.proxy(this), [-normalMove, 0]);
    this.treeEditor.keyboardHandler.addShortcut([KeyboardHandler.RIGHT], this.move.proxy(this), [normalMove, 0]);
    this.treeEditor.keyboardHandler.addShortcut([KeyboardHandler.TOP], this.move.proxy(this), [0, -normalMove]);
    this.treeEditor.keyboardHandler.addShortcut([KeyboardHandler.BOTTOM], this.move.proxy(this), [0, normalMove]);
    this.treeEditor.keyboardHandler.addShortcut([KeyboardHandler.LEFT, KeyboardHandler.CTRL], this.move.proxy(this), [-tiledMove, 0]);
    this.treeEditor.keyboardHandler.addShortcut([KeyboardHandler.RIGHT, KeyboardHandler.CTRL], this.move.proxy(this), [tiledMove, 0]);
    this.treeEditor.keyboardHandler.addShortcut([KeyboardHandler.TOP, KeyboardHandler.CTRL], this.move.proxy(this), [0, -tiledMove]);
    this.treeEditor.keyboardHandler.addShortcut([KeyboardHandler.BOTTOM, KeyboardHandler.CTRL], this.move.proxy(this), [0, tiledMove]);
    this.treeEditor.addEventListener(TreeEditor.MODE_CHANGED, this.reselectBlock.proxy(this));
    this.treeEditor.selector.addEventListener(DragSelector.SELECTION_DONE, this.handleSelectionProperties.proxy(this));
    this.deselect();
}

Class.define(PropertiesEditor, [], {
    edit:function(pElement)
    {
        this.deselect();
        let treeEditor = this.treeEditor;
        let ref = this;
        this.last_block = pElement;
        treeEditor.last_block = pElement.element.getAttribute("id");
        pElement.element.classList.add(PropertiesEditor.CLASS);

        let editable_props = pElement.getEditableProperties();

        let container = this.element.querySelector(".properties");

        this.resetProperties();

        this.handleSelectionProperties();

        let changed_cb = function(e)
        {
            pElement.setProperty(e.currentTarget.getAttribute("data-prop"), e.currentTarget.value);
        };

        let handleInput = function(pInput)
        {
            pInput.addEventListener("keydown", changed_cb, false);
            pInput.addEventListener("keyup", changed_cb, false);
            pInput.addEventListener("mouseup", changed_cb, false);
            pInput.addEventListener("focus", treeEditor.keyboardHandler.suspend.proxy(treeEditor.keyboardHandler), false);
            pInput.addEventListener("blur", treeEditor.keyboardHandler.resume.proxy(treeEditor.keyboardHandler), false);
        };

        let prop, label, inp_ct, input, id_inp, o, k, none, ul, li, action;
        for(let i in editable_props)
        {
            if(!editable_props.hasOwnProperty(i))
                continue;

            prop = editable_props[i];

            if(prop.mode && prop.mode.indexOf(treeEditor.editor_mode)===-1)
                continue;

            inp_ct = Element.create("div", {"class":"inp_container"}, container);
            id_inp = treeEditor.generateId("input_"+i);

            label = Element.create("label", {"for":id_inp, "innerHTML":prop.label+" : "}, inp_ct);


            switch(prop.type)
            {
                case "number":
                case "text":
                    input = Element.create("input", {"id":id_inp, "name":id_inp, "type":prop.type, "value":prop.value, "data-prop":i}, inp_ct);
                    handleInput(input);
                    break;
                case "html":
                    let toolbar = Element.create("div", {"id":"toolbar_"+id_inp, "style":"display: none", "class":"toolbar"}, inp_ct);

                    let f;
                    for(k in wysihtml_functions)
                    {
                        if(!wysihtml_functions.hasOwnProperty(k))
                            continue;
                        f = wysihtml_functions[k];
                        if(f === "spacer")
                        {
                            Element.create("span", {"class":"spacer"}, toolbar);
                            continue;
                        }
                        Element.create("a", {"data-wysihtml-command": f.command, "title": f.title, "class":"material-icons", "innerHTML": f.icon}, toolbar);
                    }
                    input = Element.create("div", {"id":id_inp, "name":id_inp, "innerHTML":prop.value, "data-prop":i}, inp_ct);
                    let editor = new wysihtml.Editor(id_inp, {
                        toolbar: "toolbar_"+id_inp,
                        stylesheets:["css/TreeEditor.css"],
                        parserRules: wysihtmlParserRules
                    });
                    editor.on("change", function(){
                        pElement.setProperty(this.editableElement.getAttribute("data-prop"), this.getValue(false));
                    });
                    this.rte.push(editor);
                    break;
                case "combobox":
                    let combobox = Element.create("div", {"class":"combobox"}, inp_ct);

                    none = prop.data.none;

                    if(!none)
                    {
                        prop.data.none = {"label":"Sélectionner une valeur"};
                    }

                    let s = Element.create("span", {"innerHTML":prop.data.none.label}, combobox);
                    Element.create("i", {"class":"material-icons", "innerHTML":"arrow_drop_down"}, s);

                    let hideUl = function(e){
                        if(e.target.nodeName.toLowerCase() === "li" && e.target.getAttribute("data-combobox-value"))
                            return;
                        let ul = document.querySelector(".combobox ul.displayed");
                        if(ul)
                        {
                            ul.style.display = "none";
                            ul.classList.remove("displayed");
                        }
                        document.removeEventListener("mousedown", hideUl, false);
                    };

                    s.addEventListener("click", function(e){
                        e.currentTarget.parentNode.querySelector("ul").style.display = "";
                        e.currentTarget.parentNode.querySelector("ul").classList.add("displayed");
                        document.addEventListener("mousedown", hideUl, false);
                    });

                    ul = Element.create("ul", {style:"display:none"}, combobox);

                    for(k in prop.data)
                    {
                        if(!prop.data.hasOwnProperty(k))
                            continue;
                        li = Element.create("li", {"innerHTML":prop.data[k].label, "data-combobox-value":k, "data-prop":i}, ul);
                        li.addEventListener("click", function(e){
                            pElement.setProperty(e.currentTarget.getAttribute("data-prop"), e.currentTarget.getAttribute("data-combobox-value"));
                        });
                        if(prop.data[k].overHandler)
                        {
                            li.addEventListener("mouseover", prop.data[k].overHandler, false);
                        }
                        if(prop.data[k].outHandler)
                        {
                            li.addEventListener("mouseout", prop.data[k].outHandler, false);
                        }
                    }

                    break;
                case "select":
                    input = Element.create("select", {"id":id_inp, "name":id_inp, "data-prop":i}, inp_ct);
                    input.addEventListener("change", changed_cb, false);
                    for(k in prop.data)
                    {
                        if(!prop.data.hasOwnProperty(k))
                            continue;
                        o = {"value":k, "innerHTML":prop.data[k], "class":k};
                        if(k === prop.value)
                            o.selected = "selected";
                        Element.create("option", o, input);
                    }

                    none = input.querySelector('option[value="none"]');
                    if(none)
                    {
                        none.parentNode.removeChild(none);
                        input.insertBefore(none, input.querySelector("option"));
                        none.setAttribute("selected", "selected");
                    }
                    break;
                case "list":
                    ul = Element.create("ul", {"class":"list "+i}, inp_ct);
                    let opt;
                    for(k in prop.data)
                    {
                        if(!prop.data.hasOwnProperty(k))
                            continue;
                        opt = prop.data[k];
                        li = Element.create("li", {"title":opt.title}, ul);
                        if(opt.overHandler)
                        {
                            li.addEventListener("mouseover", opt.overHandler, true);
                        }
                        if(opt.outHandler)
                        {
                            li.addEventListener("mouseout", opt.outHandler, true);
                        }
                        Element.create("span", {"innerHTML":opt.label}, li);
                        action = Element.create("span", {"innerHTML":"&times;", "data-target":pElement.element.getAttribute("id"), "data-remove":opt.extra, "class":"remove", "data-method":opt.method}, li);
                        action.addEventListener("click", function(e){
                            let t = e.currentTarget;
                            let remove = t.getAttribute("data-remove");
                            let method = t.getAttribute("data-method");
                            if(pElement[method])
                                pElement[method](remove);
                            ref.edit(pElement);
                        }, false);
                    }
                    break;
            }
        }

        inp_ct = Element.create("div", {"class":"actions"}, container);
        input = Element.create("button", {}, inp_ct);
        Element.create("span", {"class":"material-icons", "innerHTML":"add"}, input);
        Element.create("span", {"innerHTML":"Ajouter un block"}, input);
        input.addEventListener("click", function(){
            treeEditor.deselectAll();
            treeEditor.createBlock();
        }, false);
        input = Element.create("button", {"class":"delete"}, inp_ct);
        Element.create("span", {"class":"material-icons", "innerHTML":"delete"}, input);
        Element.create("span", {"innerHTML":"Supprimer le block"}, input);
        input.addEventListener("click", function(e){
            ref.deselect();
            pElement.remove();
        }, false);
    },
    handleSelectionProperties:function()
    {
        let selectedElements = this.treeEditor.selector.selectedElements();
        if(selectedElements.length < 2 || this.treeEditor.contentMode())
            return;

        let buttonsRow = this.treeEditor.selector.getSelectionProperties();

        let inpContainer, label, buttonContainer, button, row, j, maxj, icon, b;
        for(let i = 0, max = buttonsRow.length; i<max; i++)
        {
            row = buttonsRow[i];
            inpContainer = Element.create("div", {"class":"inp_container"}, this.element.querySelector(".properties"));
            label = Element.create("label", {"innerHTML":row.label+" : "}, inpContainer);
            buttonContainer = Element.create("div", {"class":"buttons"}, inpContainer);
            for(j = 0, maxj = row.buttons.length; j<maxj; j++)
            {
                b = row.buttons[j];
                if(b === "spacer")
                {
                    Element.create("span", {"class":"spacer"}, buttonContainer);
                    continue;
                }
                button = Element.create("button", {"title": b.title, "data-param": b.param}, buttonContainer);
                icon = Element.create("i", {"class":"material-icons", "innerHTML": b.icon}, button);
                button.addEventListener("click", b.method, false);
            }
        }
    },
    resetProperties:function()
    {
        let container = this.element.querySelector(".properties");
        if(this.rte.length)
        {
            let b = this.last_block;
            this.rte.forEach(function(pRte){
                if(b)
                {
                    b.setProperty(pRte.editableElement.getAttribute("data-prop"), pRte.getValue(false));
                }
                pRte.destroy();
            });
        }
        this.rte = [];
        container.innerHTML = "";
    },
    reselectBlock:function()
    {
        let b = this.treeEditor.svg.querySelector(".draggable."+PropertiesEditor.CLASS);
        if(!b)
        {
            this.resetProperties();
            this.handleSelectionProperties();
            return;
        }
        this.edit(this.treeEditor.dispatchers[b.getAttribute("id")]);
    },
    deselect:function()
    {
        this.treeEditor.svg.querySelectorAll(".draggable."+PropertiesEditor.CLASS).forEach(function(pEl){pEl.classList.remove(PropertiesEditor.CLASS);});
        this.resetProperties();
        this.last_block = null;
    },
    move:function(pVector)
    {
        if(this.treeEditor.contentMode()||!pVector||pVector.length !== 2)
            return;

        for(let i in this.treeEditor.dispatchers)
        {
            if(!this.treeEditor.dispatchers.hasOwnProperty(i))
                continue;

            if(DragSelector.isSelected(this.treeEditor.dispatchers[i]))
            {
                this.treeEditor.dispatchers[i].move(pVector[0], pVector[1]);
            }
        }
    }
});

PropertiesEditor.CLASS = "edit";

function DragSelector(pTreeEditor)
{
    this.treeEditor = pTreeEditor;
    this.svg = pTreeEditor.svg;
    pTreeEditor.keyboardHandler.addShortcut([KeyboardHandler.ESC], this.deselectAll.proxy(this));
    pTreeEditor.keyboardHandler.addShortcut([KeyboardHandler.CTRL, KeyboardHandler.A], this.selectAll.proxy(this));
    this._selectUpHandler = this.selectUpHandler.proxy(this);
    this._selectMoveHandler = this.selectMoveHandler.proxy(this);
    this.svg.addEventListener("mousedown", this.mousedownHandler.proxy(this), true);
    this.deselectAll();
}

Class.define(DragSelector, [EventDispatcher], {
    mousedownHandler:function(e)
    {
        let t = e.target;
        let id = t.getAttribute("id");
        while(!id&& t.parentNode)
        {
            if(t.nodeName.toLowerCase() === "g" && this.treeEditor.dispatchers[t.getAttribute("id")])
                id = t.getAttribute("id");
            t = t.parentNode;
        }
        let parentD = this.treeEditor.dispatchers[id];

        if((e.target.getAttribute("data-role")&&e.target.getAttribute("data-role") == "resize")
            || (e.target !== e.currentTarget && (!parentD||(parentD&&!DragSelector.isSelected(parentD)))))
            return;

        e.stopImmediatePropagation();
        e.stopPropagation();
        e.preventDefault();

        window.getSelection().removeAllRanges();

        let p = this.treeEditor.getRelativePositionFromSVG(e.clientX, e.clientY);
        this.startPosition = {x: p.x, y: p.y};

        if(parentD&&DragSelector.isSelected(parentD))
        {
            let b;
            for(let i in this.treeEditor.dispatchers)
            {
                if(!this.treeEditor.dispatchers.hasOwnProperty(i))
                    continue;
                b = this.treeEditor.dispatchers[i];

                if(!DragSelector.isSelected(b))
                    continue;

                b._startDragHandler(e);
            }
        }
        else
        {
            this.treeEditor.deselectAll();
            this.treeEditor.propertiesEditor.deselect();
            document.addEventListener("mouseup", this._selectUpHandler, false);
            document.addEventListener("mousemove", this._selectMoveHandler, false);
            this.rect = SVGElement.create("rect", {"class":"selector", "x":(p.x), "y":(p.y)}, this.svg);
        }
    },
    selectMoveHandler:function(e)
    {
        let p = this.treeEditor.getRelativePositionFromSVG(e.clientX, e.clientY);
        let width = p.x - this.startPosition.x;
        let height = p.y - this.startPosition.y;

        if(width<0)
        {
            this.rect.setAttribute("x", (this.startPosition.x - Math.abs(width)));
        }
        if(height<0)
        {
            this.rect.setAttribute("y", (this.startPosition.y - Math.abs(height)));
        }

        this.rect.setAttribute("width", Math.abs(width));
        this.rect.setAttribute("height", Math.abs(height));

        let rectangle = {};

        let ref = this;
        ["x","y","width","height"].forEach(function(pProp){
            rectangle[pProp] = Number(ref.rect.getAttribute(pProp));
        });

        let b;
        for(let i in this.treeEditor.dispatchers)
        {
            if(!this.treeEditor.dispatchers.hasOwnProperty(i))
                continue;
            b = this.treeEditor.dispatchers[i];
            if(b.checkOverlap(rectangle))
                DragSelector.select(b);
            else
                DragSelector.deselect(b);
        }
    },
    selectUpHandler:function()
    {
        document.removeEventListener("mouseup", this._selectUpHandler, false);
        document.removeEventListener("mousemove", this._selectMoveHandler, false);
        this.svg.removeChild(this.rect);
        this.rect = null;
        this.dispatchEvent(new Event(DragSelector.SELECTION_DONE));
    },
    selectedElements:function()
    {
        return this.svg.querySelectorAll('*['+DragSelector.ATTRIBUTE+'="true"]');
    },
    deselectAll:function()
    {
        this.selectedElements().forEach(function(pElement){
            pElement.removeAttribute(DragSelector.ATTRIBUTE);
        });
    },
    selectAll:function()
    {
        let b;
        for(let i in this.treeEditor.dispatchers)
        {
            if (!this.treeEditor.dispatchers.hasOwnProperty(i))
                continue;
            b = this.treeEditor.dispatchers[i];
            if(b.isSelectable())
                DragSelector.select(b);
        }
    },
    resize:function(e)
    {
        if(!e || !this.treeEditor.propertiesEditor.last_block)
            return;

        e.preventDefault();

        let kind = e.currentTarget.getAttribute("data-param");
        if(!kind)
            return;

        let setW = function(pDummy, pContext)
        {
            pContext.setDimensions(pDummy.value, pContext.getDimensions().height);
        };
        let setH = function(pDummy, pContext)
        {
            pContext.setDimensions(pContext.getDimensions().width, pDummy.value);
        };

        let ref = this;
        let ref_block = this.treeEditor.propertiesEditor.last_block;
        let selectedElements = this.selectedElements();

        let prop = kind=="horiz"?"width":"height";
        let handler = kind=="horiz"?setW:setH;
        let ref_value = ref_block.getDimensions()[prop];

        selectedElements.forEach(function(pElement){
            let b = ref.treeEditor.dispatchers[pElement.getAttribute("id")];
            if(!(b instanceof Block))
                return;
            ref.treeEditor.animate(b, prop, b.getDimensions()[prop], ref_value, 1, handler);
        });
    },
    distribute:function(e)
    {
        if(!e)
            return;

        e.preventDefault();

        let kind = e.currentTarget.getAttribute("data-param");
        if(!kind)
            return;

        let horizontal = kind === "horiz";

        let getProp = horizontal?"getX":"getY";
        let getPropComp = horizontal?"width":"height";
        let prop = horizontal?"x":"y";

        let setX = function(pDummy, pContext)
        {
            pContext.setPosition(Number(pDummy.value), pContext.getY());
        };

        let setY = function(pDummy, pContext)
        {
            pContext.setPosition(pContext.getX(), Number(pDummy.value));
        };

        let handler = horizontal?setX:setY;

        let block;
        let ignore = [null, null];
        let range = {};
        let elements = [];
        this.selectedElements().forEach(function(pElement){
            elements.push(pElement);
        });

        let ref = this;
        elements.sort(function(pA, pB)
        {
            let t1 = ref.treeEditor.dispatchers[pA.getAttribute("id")][getProp]();
            let t2 = ref.treeEditor.dispatchers[pB.getAttribute("id")][getProp]();
            if(t1<t2)
                return -1;
            else if (t1>t2)
                return 1;
            return 0;
        });

        let max = elements.length;
        for(let i = 0; i<max;i++)
        {
            block = this.treeEditor.dispatchers[elements[i].getAttribute("id")];
            if(!range.min)
            {
                range.min = block[getProp]();
                range.max = block[getProp]() + block.getDimensions()[getPropComp];
                continue;
            }

            range.min = Math.min(range.min, block[getProp]());
            range.max = Math.max(range.max, block[getProp]() + block.getDimensions()[getPropComp]);
        }

        for(let i = 0;i<max;i++)
        {
            block = this.treeEditor.dispatchers[elements[i].getAttribute("id")];

            if(range.min === block[getProp]() && !ignore[0])
                ignore[0] = elements[i];

            if((range.max === (block[getProp]() + block.getDimensions()[getPropComp])) && !ignore[1])
                ignore[1] = elements[i];
        }

        let ignoreCount = 1;
        if(ignore[0] !== ignore[1])
        {
            ignoreCount = 2;
            let blockMin = this.treeEditor.dispatchers[ignore[0].getAttribute("id")];
            let blockMax = this.treeEditor.dispatchers[ignore[1].getAttribute("id")];

            if(blockMax[getProp]() >= (blockMin[getProp]() + blockMin.getDimensions()[getPropComp]))
            {
                range.min = blockMin[getProp]() + blockMin.getDimensions()[getPropComp];
                if(blockMax[getProp]() > range.min)
                    range.max = blockMax[getProp]();
            }
        }

        let totalMargin = 0;
        for(i = 0;i<max;i++) {
            if(ignore.indexOf(elements[i]) !== -1)
                continue;
            block = this.treeEditor.dispatchers[elements[i].getAttribute("id")];
            totalMargin += block.getDimensions()[getPropComp];
        }

        let margin = ((range.max - range.min) - totalMargin) / ((max - ignoreCount)+1);

        let currentValue = range.min;
        for(i = 0;i<max;i++) {
            if(ignore.indexOf(elements[i]) !== -1)
                continue;
            block = this.treeEditor.dispatchers[elements[i].getAttribute("id")];
            currentValue += margin;
            this.treeEditor.animate(block, prop, block[getProp](), currentValue, 1, handler);
            currentValue += block.getDimensions()[getPropComp];
        }


    },
    align:function(e)
    {
        if(!e)
            return;

        e.preventDefault();

        let alignment = e.currentTarget.getAttribute("data-param");
        if(!alignment)
            return;

        let setX = function(pDummy, pContext)
        {
            pContext.setPosition(Number(pDummy.value), pContext.getY());
        };

        let setY = function(pDummy, pContext)
        {
            pContext.setPosition(pContext.getX(), Number(pDummy.value));
        };

        let horizontal = ["left","right","center"].indexOf(alignment)!==-1;

        let handler = horizontal?setX:setY;
        let getProp = horizontal?"getX":"getY";
        let getPropComp = horizontal?"width":"height";
        let propName = horizontal?"x":"y";

        let elements = this.selectedElements();

        let i, max, block, value, newValue;

        switch(alignment)
        {
            case "top":
            case "left":
                for(i = 0, max = elements.length; i<max; i++)
                {
                    block = this.treeEditor.dispatchers[elements[i].getAttribute("id")];

                    if(typeof value == "undefined")
                    {
                        value = block[getProp]();
                        continue;
                    }
                    value = Math.min(value, block[getProp]());
                }

                for(i = 0, max = elements.length; i<max; i++)
                {
                    block = this.treeEditor.dispatchers[elements[i].getAttribute("id")];
                    this.treeEditor.animate(block, propName, block[getProp](), value, 1, handler);
                }
                break;
            case "bottom":
            case "right":
                for(i = 0, max = elements.length; i<max; i++)
                {
                    block = this.treeEditor.dispatchers[elements[i].getAttribute("id")];

                    if(typeof value == "undefined")
                    {
                        value = block[getProp]()+block.getDimensions()[getPropComp];
                        continue;
                    }
                    if(!(block instanceof Block))
                        continue;
                    value = Math.max(value, block[getProp]()+block.getDimensions()[getPropComp]);
                }

                for(i = 0, max = elements.length; i<max; i++)
                {
                    block = this.treeEditor.dispatchers[elements[i].getAttribute("id")];
                    newValue = !(block instanceof Block)?value:value - block.getDimensions()[getPropComp];
                    this.treeEditor.animate(block, propName, block[getProp](), newValue, 1, handler);
                }
                break;
            case "centerV":
            case "center":
                for(i = 0, max = elements.length; i<max; i++)
                {
                    block = this.treeEditor.dispatchers[elements[i].getAttribute("id")];

                    if(typeof value == "undefined")
                    {
                        value = block[getProp]()+(block.getDimensions()[getPropComp]>>1);
                        continue;
                    }
                    newValue = !(block instanceof Block)?value:value - (block.getDimensions()[getPropComp]>>1);
                    this.treeEditor.animate(block, propName, block[getProp](), newValue, 1, handler);
                }
                break;
        }
    },
    getSelectionProperties:function()
    {
        let buttonsRows = [
            {"label":"Alignement", "buttons":[
                {"title":"Aligner les élements à gauche", "icon":"format_align_left", "method":this.align.proxy(this), "param":"left"},
                {"title":"Centrer les élements", "icon":"format_align_center", "method":this.align.proxy(this), "param":"center"},
                {"title":"Aligner les élements à droite", "icon":"format_align_right", "method":this.align.proxy(this), "param":"right"},
                "spacer",
                {"title":"Aligner les élements en haut", "icon":"vertical_align_top", "method":this.align.proxy(this), "param":"top"},
                {"title":"Centrer les élements", "icon":"vertical_align_center", "method":this.align.proxy(this), "param":"centerV"},
                {"title":"Aligner les élements en bas", "icon":"vertical_align_bottom", "method":this.align.proxy(this), "param":"bottom"}
            ]}
        ];

        if(this.selectedElements().length>2)
        {
            buttonsRows.push({
                "label":"Répartition des éléments", "buttons":[
                    {"title":"Répartition horizontale", "icon":"more_horiz", "method":this.distribute.proxy(this), "param":"horiz"},
                    {"title":"Répartition verticale", "icon":"more_vert", "method":this.distribute.proxy(this), "param":"vert"}
                ]
            });
        }

        if(this.treeEditor.propertiesEditor.last_block)
        {
            buttonsRows.push({
                "label":"Redimensionner les éléments", "buttons":[
                    {"title":"Même largeur", "icon":"swap_horiz", "method":this.resize.proxy(this), "param":"horiz"},
                    {"title":"Même hauteur", "icon":"swap_vert", "method":this.resize.proxy(this), "param":"vert"}
                ]
            });
        }

        return buttonsRows;
    }
});

DragSelector.SELECTION_DONE = "evt_selection_done";
DragSelector.ATTRIBUTE = "data-dragdrafted";
DragSelector.select = function(pDraggable)
{
    pDraggable.element.setAttribute(DragSelector.ATTRIBUTE, "true");
};
DragSelector.isSelected = function(pDraggable)
{
    return pDraggable.element.getAttribute(DragSelector.ATTRIBUTE) && pDraggable.element.getAttribute(DragSelector.ATTRIBUTE) === "true";
};
DragSelector.deselect = function(pDraggable)
{
    pDraggable.element.removeAttribute(DragSelector.ATTRIBUTE);
};

function KeyboardHandler()
{
    this.removeAllEventListener();
    document.addEventListener("keydown", this._keydownHandler.proxy(this), false);
    document.addEventListener("keyup", this._keyupHandler.proxy(this), false);
    this.states = {};
    this.shortcuts = [];
    this.enabled = true;
}

Class.define(KeyboardHandler, [EventDispatcher], {
    suspend:function()
    {
        this.enabled = false;
    },
    resume:function()
    {
        this.enabled = true;
    },
    _keydownHandler:function(e)
    {
        if([KeyboardHandler.LEFT, KeyboardHandler.RIGHT, KeyboardHandler.TOP, KeyboardHandler.BOTTOM].indexOf(e.keyCode)>-1 && this.enabled)
            e.preventDefault();
        this.states[e.keyCode] = true;
        this.triggerShortcuts();
    },
    _keyupHandler:function(e)
    {
        this.states[e.keyCode] = false;
        delete this.states[e.keyCode];
        this.triggerShortcuts();
    },
    addShortcut:function(pKeys, pHandler, pParameters)
    {
        this.shortcuts.push({keys:pKeys, handler:pHandler, parameters:pParameters});
    },
    trigger:function(pKeys)
    {
        let ref = this;
        let t = ref.states;
        ref.states = {};
        pKeys.forEach(function(pValue){
            ref.states[pValue] = true;
        });
        this.triggerShortcuts();
        ref.states = t;
    },
    triggerShortcuts:function()
    {
        if(!this.enabled || (Object.keys(this.states).length === 0 && this.states.constructor === Object))
        {
            return;
        }
        let shortcutInfo;
        let trigger, k, maxk, key;
        for(let i = 0, max = this.shortcuts.length; i<max; i++)
        {
            shortcutInfo = this.shortcuts[i];
            trigger = true;
            for(k = 0, maxk = shortcutInfo.keys.length; k<maxk; k++)
            {
                key = shortcutInfo.keys[k];
                trigger = trigger&&this.states[key];
            }
            if(trigger)
                shortcutInfo.handler(shortcutInfo.parameters||{});
        }
    }
});

KeyboardHandler.ESC = 27;
KeyboardHandler.DELETE = 46;
KeyboardHandler.LEFT = 37;
KeyboardHandler.RIGHT = 39;
KeyboardHandler.TOP = 38;
KeyboardHandler.BOTTOM = 40;
KeyboardHandler.TAB = 9;
KeyboardHandler.CTRL = 17;
KeyboardHandler.SHIFT = 20;
KeyboardHandler.C = 67;
KeyboardHandler.V = 86;
KeyboardHandler.A = 65;

function TreeEditor(pContainer, pDirection)
{
    this.removeAllEventListener();
    this.container = document.querySelector(pContainer);
    this.dispatchers = {};
    this.links = {};
    this.last_block = "";
    this.useAnimations = true;
    this.svg = this.container.querySelector("svg");
    this.initTree();
    this.keyboardHandler = new KeyboardHandler();
    this.selector = new DragSelector(this);
    this.direction = pDirection&&TreeEditor.DIRECTIONS[pDirection]?pDirection:TreeEditor.VERTI;
    this.direction = TreeEditor.DIRECTIONS[this.direction];

    let propertiesEditor = this.container.querySelector(".properties_editor");

    //reset du mode
    this.toggleMode({currentTarget:propertiesEditor.querySelector('button[data-mode="'+TreeEditor.DESIGN_MODE+'"]'), preventDefault:function(){}});

    this.propertiesEditor = new PropertiesEditor(propertiesEditor, this);
    let ref = this;
    propertiesEditor.querySelectorAll(".actions button").forEach(function(pElement) {
        pElement.addEventListener("click", ref.toggleMode.proxy(ref), false);
    });
    this.keyboardHandler.addShortcut([KeyboardHandler.CTRL, KeyboardHandler.V], this.cloneStash.proxy(this));
    this.keyboardHandler.addShortcut([KeyboardHandler.CTRL, KeyboardHandler.C], this.fillStash.proxy(this));
    this.keyboardHandler.addShortcut([KeyboardHandler.DELETE], this.deleteBlocks.proxy(this));
}

Class.define(TreeEditor, [EventDispatcher],
{
    initTree:function()
    {
        let ref = this;
        this.svg.querySelectorAll('g[data-role="block"]').forEach(function(pElement){
            ref.dispatchers[pElement.getAttribute("id")] = new Block(pElement, ref);
            ref.last_block = pElement.getAttribute("id");
        });

        let done = [];
        let s = {};
        this.svg.querySelectorAll('circle.anchor').forEach(function(pElement){
            if(!pElement.getAttribute("data-draggable")||done.indexOf(pElement.getAttribute("id"))>-1){
                return;
            }
            let id = pElement.getAttribute("id");
            console.log("getting lines of "+id);
            let segments = [];
            let points = [id];
            done.push(id);
            let anchor2;
            document.querySelectorAll('line.segment[id*="_'+id+'_"]').forEach(function(pLine){
                anchor2 = pLine.getAttribute("id").split("_")[2];
                points.push(anchor2);
                segments.push([id, anchor2]);
                done.push(anchor2);
                while(!ref.svg.querySelector("#"+anchor2).getAttribute("data-draggable")){
                    let l = document.querySelector('line.segment[id*="_'+anchor2+'_"]');
                    if(!l){
                        console.log("no line "+anchor2);
                        break;
                    }
                    let curid = l.getAttribute("id").split("_")[2];
                    segments.push([anchor2, curid]);
                    anchor2 = curid;
                    done.push(anchor2);
                    points.push(anchor2);
                }
            });
            let blocks = [pElement.getAttribute("data-draggable").split(";")[0].replace("restraintTo:", "").split(",")[0], ref.svg.querySelector("#"+anchor2).getAttribute("data-draggable").split(";")[0].replace("restraintTo:", "").split(",")[0]];
            s[pElement.getAttribute("id")] = {"blocks":blocks, "segments":segments, "points":points};
        });

        console.log(s);

        this.svg.querySelectorAll("line.segment").forEach(function(pElement)
        {
            let id = pElement.getAttribute("id");
            let anchors_id = id.split("_");
            let anchor1 = anchors_id[1];
            let anchor2 = anchors_id[2];

            console.log(anchor1+" "+anchor2);

            let el1 = ref.svg.querySelector("#"+anchor1);
            let el2 = ref.svg.querySelector("#"+anchor2);

            if(s[anchor1]){
                s[anchor1].segments.push([anchor1, anchor2]);
                s[anchor1].points.push(anchor2);
            }
            if(s[anchor2]){
                s[anchor2].segments.push([anchor1, anchor2]);
                s[anchor2].points.push(anchor1);
            }

            if(s[anchor1]&&s[anchor2]){
                s[anchor1].blocks.push(s[anchor2].blocks[0]);
                delete s[anchor2];
            }
        });
        console.log(s);

        let link_obj, k, segment_arr, segments, maxk;
        for(let i in s)
        {
            if(!s.hasOwnProperty(i))
                continue;
            link_obj = s[i];
            if(link_obj.blocks.length !== 2)
                continue;

            segments = [];
            for(k = 0, maxk = link_obj.segments.length; k<maxk; k++)
            {
                segment_arr = link_obj.segments[k];
                segments.push(new Segment(segment_arr[0], segment_arr[1], null,null, this));
            }

            if(segments.length === 0)
                continue;
            new Link(link_obj.blocks[0], link_obj.blocks[1], this, segments);
        }
    },
    generateId:function(pComplement)
    {
        return this.svg.parentNode.getAttribute("id")+"-"+pComplement;
    },
    suspend:function()
    {
        this.keyboardHandler.suspend();
        this.dispatchEvent(new Event(TreeEditor.SUSPENDED));
    },
    resume:function()
    {
        this.keyboardHandler.resume();
        this.dispatchEvent(new Event(TreeEditor.RESUMED));
    },
    animate:function(pDispatcher, pProp, pStartValue, pValue, pDuration, pOnUpdate)
    {
        if(!this.useAnimations)
        {
            pOnUpdate({value:pValue}, pDispatcher);
            return;
        }
        let id = pDispatcher.element.getAttribute("id");
        if(!this.tweens)
            this.tweens = {};
        if(!this.tweens[id])
            this.tweens[id] = {};
        if(this.tweens[id][pProp])
            M4Tween.killTweensOf(this.tweens[id][pProp]);
        this.tweens[id][pProp] = {value:pStartValue};
        M4Tween.to(this.tweens[id][pProp], pDuration, {"value":pValue, "useStyle":false}).onUpdate(function(pDummy){
            pOnUpdate(pDummy, pDispatcher);
        });
    },
    deleteBlocks:function()
    {
        let ref = this;
        this.selector.selectedElements().forEach(function(pElement){
            ref.dispatchers[pElement.getAttribute("id")].remove();
        });
    },
    getNextAnchorIndex:function()
    {
        let selector = 'circle.anchor:last-of-type';
        if(!this.svg.querySelector(selector))
            return 1;
        let id = this.svg.querySelector(selector).getAttribute("id").split("-");
        return Number(id[id.length-1]) + 1;
    },
    getNextBlockIndex:function()
    {
        let selector = 'g[data-role="block"]:last-of-type';
        if(!this.svg.querySelector(selector))
            return 1;
        let id = this.svg.querySelector(selector).getAttribute("id").split("-");
        return Number(id[id.length-1]) + 1;
    },
    fillStash:function()
    {
        TreeEditor.stash = [];
        this.selector.selectedElements().forEach(function(pElement) {
            TreeEditor.stash.push(pElement);
        });
    },
    cloneStash:function()
    {
        let newSelection = [];
        let ref = this;
        let block, newGroup, newBlock, newIndex;
        TreeEditor.stash.forEach(function(pElement)
        {
            block = ref.dispatchers[pElement.getAttribute("id")];
            newIndex = ref.getNextBlockIndex();
            newGroup = pElement.cloneNode(true);
            newGroup.setAttribute("id", ref.generateId(GROUP_BASE_ID+newIndex));
            ref.svg.insertBefore(newGroup, ref.svg.querySelector("line.segment:first-of-type"));

            newBlock = new Block(newGroup, ref);

            if(block)
                newBlock.setPosition(block.getX()+10, block.getY()+10);
            ref.dispatchers[newGroup.getAttribute("id")] = newBlock;
            newSelection.push(newBlock);
        });
        this.keyboardHandler.trigger([KeyboardHandler.ESC]);
        newSelection.forEach(function(pBlock){
            DragSelector.select(pBlock);
        });
    },
    createLink:function(pFirstBlock, pSecondBlock)
    {
        return new Link(pFirstBlock, pSecondBlock, this);
    },
    createBlock:function()
    {
        let dimensions = {width:200, height:75};
        let previous = this.dispatchers[this.last_block];

        let index = this.getNextBlockIndex();
        let g = SVGElement.create("g", {
            "transform":"translate("+(previous.getX()+(previous.getWidth()>>1) - (dimensions.width>>1))+","+(previous.getY()+previous.getHeight()+30)+")",
            "id":this.generateId(GROUP_BASE_ID+index),
            "data-role":"block",
            "data-type":"diagnostic"
        });

        SVGElement.create("rect", {"width":dimensions.width, "height":dimensions.height}, g);

        let fo = SVGElement.create("foreignObject", {"width":dimensions.width-20, "height":dimensions.height-20, "x":10, "y":10}, g);

        let cache = Element.create("div", {"class":"cache"}, fo);
        Element.create("div", {"data-name":"description", "data-type":"html", "innerHTML":"Block "+index}, cache);

        this.svg.insertBefore(g, this.svg.querySelector("line.segment:first-of-type"));

        this.dispatchers[g.getAttribute("id")] = new Block(g, this);

        this.createLink(this.last_block, g.getAttribute("id"));

        this.dispatchers[g.getAttribute("id")].select();
    },
    toggleHighlightBlock:function(pId, pMethod)
    {
        if(!this.svg.querySelector("#"+pId))
            return;
        this.svg.querySelector("#"+pId).classList[pMethod||"remove"]("highlight");
    },
    toggleMode:function(e)
    {
        e.preventDefault();
        let t = e.currentTarget;
        let ref = this;
        this.container.querySelectorAll(".properties_editor>.actions button").forEach(function(pButton){
            if(pButton === t)
                return;
            ref.svg.classList.remove(pButton.getAttribute("data-mode"));
            pButton.classList.add("inactive");
        });
        t.classList.remove("inactive");
        this.editor_mode = t.getAttribute("data-mode");
        this.svg.classList.add(this.editor_mode);
        this.dispatchEvent(new Event(TreeEditor.MODE_CHANGED));
    },
    contentMode:function()
    {
        return this.editor_mode === TreeEditor.CONTENT_MODE;
    },
    deselectAll:function()
    {
        this.selector.deselectAll();
    },
    getRelativePositionFromSVG:function(pX, pY)
    {
        let t = this.svg.getBoundingClientRect();
        return {x: (pX - t.left), y: (pY - t.top)};
    },
    save:function(pHandler){
        let ref = this;
        Request.load('css/TreeEditor.css').onComplete(function(pEvent){
            let svg = ref.svg.cloneNode(true);
            svg.classList.remove(TreeEditor.DESIGN_MODE);
            svg.classList.add(TreeEditor.CONTENT_MODE);
            svg.querySelectorAll('*['+DragSelector.ATTRIBUTE+'="true"]').forEach(function(pElement){pElement.removeAttribute(DragSelector.ATTRIBUTE);});
            svg.querySelectorAll('.'+PropertiesEditor.CLASS).forEach(function(pElement){pElement.classList.remove(PropertiesEditor.CLASS);});
            SVGElement.create("style", {innerHTML:pEvent.responseText}, svg, svg.firstChild);
            SVGElement.create("style", {innerHTML:"@import url(https://fonts.googleapis.com/css?family=Roboto);"}, svg, svg.firstChild);
            let cv = document.createElement("canvas");
            let ctx = cv.getContext("2d");

            let b = ref.svg.getBoundingClientRect();

            cv.setAttribute("width", b.width+"px");
            cv.setAttribute("height", b.height+"px");

            let img = new Image();
            img.onload = function(){
                img.onload = null;
                ctx.drawImage(img, 0, 0);
                pHandler(cv.toDataURL("image/png"));
            };
            img.setAttribute("src", "data:image/svg+xml;utf8," + new XMLSerializer().serializeToString(svg));
        });
    }
});

TreeEditor.DESIGN_MODE = "design_mode";
TreeEditor.CONTENT_MODE = "content_mode";
TreeEditor.MODE_CHANGED = "evt_mode_changed";
TreeEditor.SUSPENDED = "evt_suspended";
TreeEditor.RESUMED = "evt_resumed";

TreeEditor.create = function(pSelector, pDirection)
{
    return new TreeEditor(pSelector, pDirection);
};

TreeEditor.stash = [];

TreeEditor.HORIZ = "direction_h";
TreeEditor.VERTI = "direction_v";

TreeEditor.DIRECTIONS = {};
TreeEditor.DIRECTIONS[TreeEditor.HORIZ] = {"restraints":["right,50%", "left,50%"]};
TreeEditor.DIRECTIONS[TreeEditor.VERTI] = {"restraints":["50%,bottom", "50%,top"]};

TreeEditor.UTILS = {
    getTranslateXValue:function(pElement)
    {
        let v = document.defaultView.getComputedStyle(pElement, null).transform.split(",");
        return Number(v[v.length-2].replace(" ", "").replace(")", ""))||0;
    },
    getTranslateYValue:function(pElement)
    {
        let v = document.defaultView.getComputedStyle(pElement, null).transform.split(",");
        return Number(v[v.length-1].replace(" ", "").replace(")", ""))||0;
    }
};

NodeList.prototype.forEach = Array.prototype.forEach;