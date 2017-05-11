var NS_SVG = "http://www.w3.org/2000/svg";
var GROUP_BASE_ID = "group-";
var LINK_BASE_ID = "link_";
var ANCHOR_BASE_ID = "anchor-";
var SEGMENT_BASE_ID = "segment_";

var type_list = {
    "diagnostic":"D&eacute;marche diagnostique",
    "reflexion": "&Eacute;valuation",
    "treatment": "Traitement"
};
var grade_list = {
    "Grade A":"Grade A",
    "Grade B":"Grade B",
    "Grade C":"Grade C",
    "AE":"AE"
};
var note_list = {
    "1":"1",
    "2":"2",
    "3":"3",
    "4":"4"
};

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
        if(this.treeEditor.isFrozen()
            || (e.target.getAttribute("contenteditable")&&e.target.getAttribute("contenteditable")=="true"))
            return;
        this.relativePointer.x = e.clientX - this.getX();
        this.relativePointer.y = e.clientY - this.getY();
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
        var s = this.treeEditor.getScroll();
        var p = {x: e.clientX - this.relativePointer.x, y: s.y + e.clientY - this.relativePointer.y};
        this.setPosition(p.x, p.y);
    },
    _parseOptions:function(pString)
    {
        if(!pString)
            return {};

        var options = {};

        var opts = pString.split(";");

        var o, name, params;
        for(var i = 0, max = opts.length; i<max;i++)
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
        var strOpt = [], opt;
        for(var i in this.options)
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
        var restraint = this.options.restraintTo;
        var rPosition = this.treeEditor.dispatchers[restraint[0]].getRelativePosition(restraint[1]||"50%", restraint[2]||"50%");
        this.setPosition(rPosition.x, rPosition.y);
    },
    remove:function()
    {
        var id = this.element.getAttribute("id");
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
        var restraint = this.options.restraintTo;
        var s = this.treeEditor.getScroll();
        pX = Math.max(pX, 0);
        pY = Math.max(pY, 0);
        pX = Math.min(pX, this.treeEditor.svg.getBoundingClientRect().width - this.getWidth());
        pY = Math.min(pY, this.treeEditor.svg.getBoundingClientRect().height- this.getHeight());
        if(restraint)
        {
            var t = this.treeEditor.dispatchers[restraint[0]];

            pX = Math.max(t.getX(), pX);
            pX = Math.min(t.getX() + t.getWidth(), pX);
            pY = Math.max(t.getY(), pY);
            pY = Math.min(t.getY() + t.getHeight(), pY);
            var newRestraint = {x:(((pX - t.getX()) / t.getWidth())*100)+"%", y:(((pY - t.getY()) / t.getHeight()) * 100)+"%"};
            if(["left", "right"].indexOf(restraint[1])>-1)
            {
                if(restraint[1]== "left")
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
                if(restraint[2]== "top")
                {
                    pY = s.y + t.getY();
                }
                else
                {
                    pY = s.y + t.getY()+t.getHeight();
                }
                newRestraint.y = restraint[2];
            }

            this.options.restraintTo[1] = newRestraint.x;
            this.options.restraintTo[2] = newRestraint.y;
            this._updateOptions();
        }
        this.element.setAttribute("transform", "translate("+pX+","+pY+")");
        this.dispatchEvent(new Event(InteractiveEvent.BOUNDS_CHANGED));
    },
    move:function(pVectorX, pVectorY)
    {
        var c = this.treeEditor.getScroll();
        this.setPosition((c.x + this.getX())+pVectorX, (c.y + this.getY())+pVectorY);
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
        var t = this.element.getBoundingClientRect();
        return Number(t.left)||0;
    },
    getY:function()
    {
        var t = this.element.getBoundingClientRect();
        return Number(t.top)||0;
    },
    getWidth:function()
    {
        var t = this.element.getBoundingClientRect();
        return Number(t.width)||0;
    },
    getHeight:function()
    {
        var t = this.element.getBoundingClientRect();
        return Number(t.height)||0;
    },
    getRelativePosition:function(pLeft, pTop)
    {
        var scroll = this.treeEditor.getScroll();
        var left = 0;
        var top = 0;

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
            x: scroll.x + this.getX()+(left * this.getWidth()),
            y: scroll.y + this.getY()+(top * this.getHeight())
        };
    },
    checkOverlap:function(pRect)
    {
        if(!this.isSelectable())
            return;

        var c = this.treeEditor.getScroll();

        var left1 = (c.x + this.getX());
        var right1 = (c.x + this.getX())+this.getWidth();
        var top1 = (c.y + this.getY());
        var bottom1 = (c.y + this.getY())+this.getHeight();

        var left2 = pRect.x;
        var right2 = pRect.x+pRect.width;
        var top2 = pRect.y;
        var bottom2 = pRect.y+pRect.height;

        return (left1<right2 && left2<right1 && top1<bottom2 && top2 < bottom1);
    },
    isSelectable:function()
    {
        return !this.options.restraintTo;
    }
});

var InteractiveEvent = {
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
        if(this.treeEditor.isFrozen())
            return;

        var t = e.target;

        if(t.getAttribute("data-role") && t.getAttribute("data-role") === "resize")
        {
            e.stopPropagation();
            e.stopImmediatePropagation();
            this.relativePointer.x = e.clientX - this.getX();
            this.relativePointer.y = e.clientY - this.getY();
            this.startDimensions = {width:this.getWidth(), height:this.getHeight()};
            document.addEventListener("mouseup", this.__resizedHandler, false);
            document.addEventListener("mousemove", this.__resizeHandler, false);
        }
    },
    _resizeHandler:function(e)
    {
        var newPosition = {
            x: e.clientX - this.getX(),
            y: e.clientY - this.getY()
        };

        var diff = {
            x: newPosition.x - this.relativePointer.x,
            y: newPosition.y - this.relativePointer.y
        };

        if(e.shiftKey)
        {
            var max = Math.max(diff.x, diff.y);
            diff.x = max;
            diff.y = max;
        }

        var newDimensions = {
            width:this.startDimensions.width + diff.x,
            height:this.startDimensions.height + diff.y
        };

        newDimensions.width = Math.max(newDimensions.width, 100);
        newDimensions.height = Math.max(newDimensions.height, 50);

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
        var rect = this.element.querySelector("rect");
        rect.setAttribute("width", pWidth);
        rect.setAttribute("height", pHeight);
        var resizer = this.element.querySelector('path[data-role="resize"]');
        resizer.setAttribute("transform", "translate("+(pWidth-15)+", "+(pHeight-15)+")");
        this.dispatchEvent(new Event(InteractiveEvent.BOUNDS_CHANGED));
    },
    getDimensions:function()
    {
        var rect = this.element.querySelector("rect");
        return {width:Number(rect.getAttribute("width")), height:Number(rect.getAttribute("height"))};
    }
});

function Block(pElement, pTreeEditor)
{
    this._setupResizable(pElement, pTreeEditor);
    this.element.addEventListener("click", this.select.proxy(this), false);
    this.previous = {};
    this.next = {};
    this.collections = [new ElementCollection("notes", this, "left,bottom"),new ElementCollection("grades", this, "right-18,bottom")];
    this.addEventListener(InteractiveEvent.BOUNDS_CHANGED, this._sizedUpdatedHandler.proxy(this), false);
    var ref = this;
    this.element.querySelectorAll('foreignObject *[contenteditable="true"]').forEach(function(pElement)
    {
        pElement.addEventListener("mousedown", ref._editContentHandler, false);
    });
}

Class.define(Block,[Resizable], {
    select:function()
    {
        this.treeEditor.propertiesEditor.edit(this);
    },
    setProperty:function(pName, pValue)
    {
        switch(pName)
        {
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
                if(pValue != "none")
                {
                    this.treeEditor.createLink(this.element.getAttribute("id"), pValue);
                    this.select();
                }
                break;
            default:
                console.log("Block::setProperty('"+pName+"', '"+pValue+"');");
                break;
        }
    },
    getEditableProperties:function()
    {
        var properties = {
            "type": {
                "label":"Type de block",
                "type":"select",
                "data":type_list,
                "value":this.element.getAttribute("data-type")
            }
        };

        var collections = [{"labelList":"Note", "name":"notes", "method":"removeNote", "availableList":note_list, "labelDefaultAdd":"Sélectionner une note", "labelAdd":"Ajouter une note"},
                            {"labelList":"Grade", "name":"grades", "method":"removeGrade", "availableList":grade_list, "labelDefaultAdd":"Sélectionner un grade", "labelAdd":"Ajouter un grade"}];
        var coll, dList, selectedData, value, i, max, ignore, addList, j, has_options;
        for(var k = 0, maxk = collections.length; k<maxk; k++)
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
                    "type":"select",
                    "data":addList
                };
            }

        }

        var hasNext = false;
        var next = {};
        var bl, label, title;
        for(i in this.next)
        {
            if(!this.next.hasOwnProperty(i))
                continue;
            bl = this.treeEditor.dispatchers[i];
            title = bl.element.querySelector('foreignObject div[data-name="title"]').textContent;
            label = title;
            if(label.length>30)
                label = label.substr(0, 27)+"...";
            next[i] = {"label":label, "extra":this.next[i], "title":title, "method":"removeLink"};
            hasNext = true;
        }
        if(hasNext)
        {
            properties.next = {
                "label":"Liens sortants",
                "type":"list",
                "data":next
            };
        }

        ignore = [this.element.getAttribute("id")].concat(this.getLinkedBlocks());
        has_options = false;
        var further_blocks = {"none":"Sélectionner un block"};
        for(i in this.treeEditor.dispatchers)
        {
            if(!this.treeEditor.dispatchers.hasOwnProperty(i)||ignore.indexOf(i)>-1)
                continue;
            title = this.treeEditor.dispatchers[i].element.querySelector('foreignObject *[data-name="title"]');
            if(!title)
                continue;
            further_blocks[this.treeEditor.dispatchers[i].element.getAttribute("id")] = title.innerHTML;
            has_options = true;
        }

        if(has_options)
        {
            properties.newLink = {
                "label":"Ajouter un lien vers",
                "type":"select",
                "data":further_blocks
            };
        }

        return properties;
    },
    nextBlockRemovedHandler:function(e){
        var id = e.currentTarget.element.getAttribute("id");
        this.next[id] = null;
        delete this.next[id];
    },
    previousBlockRemovedHandler:function(e){
        var id = e.currentTarget.element.getAttribute("id");
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
        for(var i in this.next)
        {
            if(!this.next.hasOwnProperty(i))
                continue;
            if(this.next[i] === pLink)
            {
                this.next[i] = null;
                delete this.next[i];
                this.treeEditor.links[pLink].remove();
            }
        }
    },
    addPreviousBlock:function(pId, pLine)
    {
        for(var i in this.previous)
        {
            if(i === pId)
                return;
        }
        this.previous[pId] = pLine;
        this.treeEditor.dispatchers[pId].addEventListener(InteractiveEvent.REMOVED, this.previousBlockRemovedHandler.proxy(this), false);
    },
    addNextBlock:function(pId, pLine)
    {
        for(var i in this.next)
        {
            if(i === pId)
                return;
        }
        this.next[pId] = pLine;
        this.treeEditor.dispatchers[pId].addEventListener(InteractiveEvent.REMOVED, this.nextBlockRemovedHandler.proxy(this), false);
    },
    getLinkedBlocks:function()
    {
        var linked = [];
        for(var k in this.next)
        {
            if(!this.next.hasOwnProperty(k))
                continue;
            linked.push(k);
        }
        for(k in this.previous)
        {
            if(!this.previous.hasOwnProperty(k))
                continue;
            linked.push(k);
        }
        return linked;
    },
    _sizedUpdatedHandler:function()
    {
        var fo = this.element.querySelector("foreignObject");
        if(!fo)
            return;

        var rectDimensions = this.getDimensions();

        fo.setAttribute("width", rectDimensions.width - 20);
        fo.setAttribute("height", rectDimensions.height - 20);
    },
    _editContentHandler:function(e)
    {
        //Todo : traitement spécifique pour l'édition HTML
        console.log("Block.editContentHandler : "+e.currentTarget.getAttribute("data-type"));
    }
});

function Anchor(pId, pPosition, pTreeEditor)
{
    this.radius = 10;
    var opt = {
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
        var pos = pPosition.split(",");
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
    getX:function()
    {
        var t = this.element.getBoundingClientRect();
        return (Number(t.left)||0)+this.radius;
    },
    getY:function()
    {
        var t = this.element.getBoundingClientRect();
        return (Number(t.top)||0)+this.radius;
    }
});

function Segment(pIdAnchor1, pIdAnchor2, pPositionAnchor1, pPositionAnchor2, pTreeEditor)
{
    this.removeAllEventListener();
    this.treeEditor = pTreeEditor;
    this.svg = pTreeEditor.svg;
    var index = (document.querySelector("circle.anchor:last-of-type")?Number(document.querySelector("circle.anchor:last-of-type").getAttribute("id").split("-")[1]) + 1:1);

    this.idAnchor1 = pIdAnchor1||ANCHOR_BASE_ID+index;
    this.idAnchor2 = pIdAnchor2||ANCHOR_BASE_ID+(index+1);

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
        this.element.setAttribute("marker-end", "url(#arrow)");
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
        if(this.treeEditor.isFrozen())
            return;

        this.splitInfo = e;
        this.dispatchEvent(new Event(InteractiveEvent.SPLIT));
    },
    _updatePositionHandler:function(e)
    {
        var scroll = this.treeEditor.getScroll();
        this.element.setAttribute("x1", scroll.x + this.anchor1.getX());
        this.element.setAttribute("y1", scroll.y + this.anchor1.getY());
        this.element.setAttribute("x2", scroll.x + this.anchor2.getX());
        this.element.setAttribute("y2", scroll.y + this.anchor2.getY());
    },
    remove:function(e)
    {
        var id = this.element.getAttribute("id");
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
        var anchor1 = this.anchor1.getStringPosition();
        var anchor2 = this.anchor2.getStringPosition();
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
        this.addSegment(null, null, "restraintTo:"+this.firstBlock+",50%,bottom", "restraintTo:"+this.secondBlock+",50%,top");
}

Class.define(Link, [], {
    remove:function(e)
    {
        var s;
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
        var s = e.currentTarget;

        var idAnchor1 = null;
        var idAnchor2 = null;
        var positionAnchor1 = null;
        var positionAnchor2 = null;

        var anchorsPositions = s.getAnchorsPositions();

        if(s.anchor1.isShared())
            idAnchor1 = s.anchor1.id;
        else
            positionAnchor1 = anchorsPositions[0];

        if(s.anchor2.isShared())
            idAnchor2 = s.anchor2.id;
        else
            positionAnchor2 = anchorsPositions[1];

        var scroll = this.treeEditor.getScroll();
        var splitPosition = (scroll.x+s.splitInfo.clientX)+","+ (scroll.y+s.splitInfo.clientY);

        s.removeEventListener(InteractiveEvent.REMOVED, this._removeHandler, false);
        var segments = [];
        for(var i = 0, max = this.segments.length; i<max;i++)
        {
            if(this.segments[i].id !== s.id)
            {
                segments.push(this.segments[i]);
            }
        }
        this.segments = segments;
        s.remove();

        var newSegment = this.addSegment(idAnchor1, null, positionAnchor1, splitPosition);
        this.addSegment(newSegment.idAnchor2, idAnchor2, null, positionAnchor2);
    },
    addSegment:function(pAnchor1, pAnchor2, pPositionAnchor1, pPositionAnchor2)
    {
        var s = new Segment(pAnchor1, pAnchor2, pPositionAnchor1, pPositionAnchor2, this.treeEditor);
        s.addEventListener(InteractiveEvent.REMOVED, this._removeHandler, false);
        s.addEventListener(InteractiveEvent.SPLIT, this.splitSegment.proxy(this), false);
        this.segments.push(s);
        return s;
    },
    setSegments:function(pSegments)
    {
        var s;
        for(var i = 0, max = pSegments.length; i<max; i++)
        {
            s = pSegments[i];
            s.addEventListener(InteractiveEvent.REMOVED, this._removeHandler, false);
            s.addEventListener(InteractiveEvent.SPLIT, this.splitSegment.proxy(this), false);
            this.segments.push(s);
        }
    }
});

function ElementCollection(pType, pParentBlock, pParentAlign)
{
    this.type = pType;
    this.groupElement = pParentBlock.element.querySelector('g[data-role="'+pType+'"]');
    if(!this.groupElement)
        this.groupElement = SVGElement.create("g", {"data-role":pType}, pParentBlock.element);
    this.parentBlock = pParentBlock;
    this.parentAlign = pParentAlign;
    this.elements = [];
    this.elementsValues = [];
    var ref = this;
    this.groupElement.querySelectorAll("g").forEach(function(pElement)
    {
        ref.elements.push(pElement);
        ref.elementsValues.push(pElement.querySelector("text").textContent);
    });
    this.updatePosition();
    this._updatePosition = this.updatePosition.proxy(this);
    this.parentBlock.addEventListener(InteractiveEvent.BOUNDS_CHANGED, this._updatePosition);
    this.parentBlock.addEventListener(InteractiveEvent.REMOVED, this.parentRemovedHandler);
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
            var t1 = pA.querySelector("text").textContent;
            var t2 = pB.querySelector("text").textContent;
            if(t1<t2)
                return -1;
            else if (t1>t2)
                return 1;
            return 0;
        });
        var p = this.groupElement;
        this.elements.forEach(function(pElement){
            p.removeChild(pElement);
            p.appendChild(pElement);
        });
        this.updatePosition();
    },
    removeElement:function(pLabel)
    {
        var filtered = [];
        var v;
        for(var i = 0, max = this.elementsValues.length; i<max;i++)
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
        var t = this.groupElement.getBoundingClientRect();
        return Number(t.width)||0;
    },
    getHeight:function()
    {
        var t = this.groupElement.getBoundingClientRect();
        return Number(t.height)||0;
    },
    updatePosition:function()
    {
        var currentX = 0;
        for(var i = 0, max = this.elements.length; i<max; i++)
        {
            this.elements[i].setAttribute("transform", "translate("+currentX+",0)");
            currentX += this.elements[i].getBoundingClientRect().width + 3;
        }
        var alignments = this.parentAlign.split(",");
        var x = 0;
        var y = 0;
        if(alignments.length==2)
        {
            var marginLeft = alignments[0].replace("right", "").replace("left", "");
            var marginTop = alignments[1].replace("top", "").replace("bottom", "");
            var left = alignments[0].replace(marginLeft, "");
            var top = alignments[1].replace(marginTop, "");
            var parentDimensions = this.parentBlock.getDimensions();
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
    var g = SVGElement.create("g", {"data-role":"grade"}, pParent);
    var rect = SVGElement.create("rect", {}, g);
    var label = SVGElement.create("text", {"innerHTML": pLabel, "y":12, "x":2}, g);
    rect.setAttribute("width", label.getBoundingClientRect().width+4);
    rect.setAttribute("height", label.getBoundingClientRect().height);
    return g;
};

ElementCollection.notes = function(pLabel, pParent)
{
    var g = SVGElement.create("g", {"data-role":"note"}, pParent);
    var circle = SVGElement.create("circle", {}, g);
    var label = SVGElement.create("text", {"innerHTML": pLabel}, g);
    var r = Math.max(label.getBBox().width, label.getBBox().height)>>1;
    circle.setAttribute("cx", r);
    circle.setAttribute("cy", r);
    circle.setAttribute("r", r);
    label.setAttribute("x", r - (r>>1)-1);
    label.setAttribute("y", (2*r)-3);
    return g;
};

var SVGElement = {
    create:function(pName, pAttributes, pParentNode, pInsertBefore)
    {
        return Element.create(pName, pAttributes, pParentNode, pInsertBefore, NS_SVG);
    }
};

var Element = {
    create:function(pName, pAttributes, pParentNode, pInsertBefore, pNs)
    {
        var element = pNs?document.createElementNS(pNs, pName):document.createElement(pName);

        for(var i in pAttributes)
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
    var normalMove = 1;
    var tiledMove = 15;
    this.treeEditor.keyboardHandler.addShortcut([KeyboardHandler.ESC], this.deselect.proxy(this));
    this.treeEditor.keyboardHandler.addShortcut([KeyboardHandler.LEFT], this.move.proxy(this), [-normalMove, 0]);
    this.treeEditor.keyboardHandler.addShortcut([KeyboardHandler.RIGHT], this.move.proxy(this), [normalMove, 0]);
    this.treeEditor.keyboardHandler.addShortcut([KeyboardHandler.TOP], this.move.proxy(this), [0, -normalMove]);
    this.treeEditor.keyboardHandler.addShortcut([KeyboardHandler.BOTTOM], this.move.proxy(this), [0, normalMove]);
    this.treeEditor.keyboardHandler.addShortcut([KeyboardHandler.LEFT, KeyboardHandler.CTRL], this.move.proxy(this), [-tiledMove, 0]);
    this.treeEditor.keyboardHandler.addShortcut([KeyboardHandler.RIGHT, KeyboardHandler.CTRL], this.move.proxy(this), [tiledMove, 0]);
    this.treeEditor.keyboardHandler.addShortcut([KeyboardHandler.TOP, KeyboardHandler.CTRL], this.move.proxy(this), [0, -tiledMove]);
    this.treeEditor.keyboardHandler.addShortcut([KeyboardHandler.BOTTOM, KeyboardHandler.CTRL], this.move.proxy(this), [0, tiledMove]);
}

Class.define(PropertiesEditor, [], {
    edit:function(pElement)
    {
        var treeEditor = this.treeEditor;
        var ref = this;
        this.deselect();
        treeEditor.last_block = pElement.element.getAttribute("id");
        pElement.element.classList.add(PropertiesEditor.CLASS);

        var editable_props = pElement.getEditableProperties();

        var container = this.element.querySelector(".properties");

        container.innerHTML = "";

        var prop, label, inp_ct, input, id_inp, changed_cb, o, k;
        for(var i in editable_props)
        {
            if(!editable_props.hasOwnProperty(i))
                continue;

            prop = editable_props[i];

            inp_ct = Element.create("div", {"class":"inp_container"}, container);
            id_inp = "input_"+i;

            label = Element.create("label", {"for":id_inp, "innerHTML":prop.label+" : "}, inp_ct);

            changed_cb = function(e){
                pElement.setProperty(e.currentTarget.getAttribute("data-prop"), e.currentTarget.value);
            };

            switch(prop.type)
            {
                case "text":
                    input = Element.create("input", {"id":id_inp, "name":id_inp, "type":"text", "value":prop.value, "data-prop":i}, inp_ct);
                    input.addEventListener("keydown", changed_cb, false);
                    input.addEventListener("keyup", changed_cb, false);
                    break;
                case "select":
                    input = Element.create("select", {"id":id_inp, "name":id_inp, "data-prop":i}, inp_ct);
                    input.addEventListener("change", changed_cb, false);
                    for(k in prop.data)
                    {
                        if(!prop.data.hasOwnProperty(k))
                            continue;
                        o = {"value":k, "innerHTML":prop.data[k], "class":k};
                        if(k == prop.value)
                            o.selected = "selected";
                        Element.create("option", o, input);
                    }

                    var none = input.querySelector('option[value="none"]');
                    if(none)
                    {
                        none.parentNode.removeChild(none);
                        input.insertBefore(none, input.querySelector("option"));
                        none.setAttribute("selected", "selected");
                    }
                    break;
                case "list":
                    var ul = Element.create("ul", {"class":"list "+i}, inp_ct);
                    var li, action, opt;
                    for(k in prop.data)
                    {
                        if(!prop.data.hasOwnProperty(k))
                            continue;
                        opt = prop.data[k];
                        li = Element.create("li", {}, ul);
                        Element.create("span", {"innerHTML":opt.label, "title":opt.title}, li);
                        action = Element.create("span", {"innerHTML":"&times;", "data-target":pElement.element.getAttribute("id"), "data-remove":opt.extra, "class":"remove", "data-method":opt.method}, li);
                        action.addEventListener("click", function(e){
                            var t = e.currentTarget;
                            var remove = t.getAttribute("data-remove");
                            var method = t.getAttribute("data-method");
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
        Element.create("span", {"class":"material-icons", "innerHTML":"&#xE145;"}, input);
        Element.create("span", {"innerHTML":"Ajouter un block"}, input);
        input.addEventListener("click", function(){
            treeEditor.deselectAll();
            treeEditor.createBlock();
        }, false);
        input = Element.create("button", {"class":"delete"}, inp_ct);
        Element.create("span", {"class":"material-icons", "innerHTML":"&#xE872;"}, input);
        Element.create("span", {"innerHTML":"Supprimer le block"}, input);
        input.addEventListener("click", function(e){
            ref.deselect();
            pElement.remove();
        }, false);
    },
    deselect:function()
    {
        document.querySelectorAll(".draggable."+PropertiesEditor.CLASS).forEach(function(pEl){pEl.classList.remove(PropertiesEditor.CLASS);});
        var container = this.element.querySelector(".properties");
        container.innerHTML = "";
    },
    move:function(pVector)
    {
        if(this.treeEditor.isFrozen()||!pVector||pVector.length!=2)
            return;

        for(var i in this.treeEditor.dispatchers)
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
}

Class.define(DragSelector, [], {
    mousedownHandler:function(e)
    {
        var t = e.target;
        var id = t.getAttribute("id");
        while(!id&& t.parentNode)
        {
            if(t.nodeName.toLowerCase() === "g" && this.treeEditor.dispatchers[t.getAttribute("id")])
                id = t.getAttribute("id");
            t = t.parentNode;
        }
        var parentD = this.treeEditor.dispatchers[id];

        if((e.target.getAttribute("data-role")&&e.target.getAttribute("data-role") == "resize")
            || (e.target.getAttribute("contenteditable")&&e.target.getAttribute("contenteditable") == "true")
            || (e.target !== e.currentTarget && (!parentD||(parentD&&!DragSelector.isSelected(parentD)))))
            return;

        e.stopImmediatePropagation();
        e.stopPropagation();
        e.preventDefault();

        window.getSelection().removeAllRanges();

        var c = this.treeEditor.getScroll();
        this.startPosition = {x: c.x + e.clientX, y: c.y + e.clientY};

        if(parentD&&DragSelector.isSelected(parentD))
        {
            var b;
            for(var i in this.treeEditor.dispatchers)
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
            this.rect = SVGElement.create("rect", {"class":"selector", "x":(c.x+ e.clientX), "y":(c.y+ e.clientY)}, this.svg);
        }
    },
    selectMoveHandler:function(e)
    {
        var c = this.treeEditor.getScroll();
        var width = (c.x + e.clientX) - this.startPosition.x;
        var height = (c.y + e.clientY) - this.startPosition.y;

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

        var rectangle = {};

        var ref = this;
        ["x","y","width","height"].forEach(function(pProp){
            rectangle[pProp] = Number(ref.rect.getAttribute(pProp));
        });

        var b;
        for(var i in this.treeEditor.dispatchers)
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
        var b;
        for(var i in this.treeEditor.dispatchers)
        {
            if (!this.treeEditor.dispatchers.hasOwnProperty(i))
                continue;
            b = this.treeEditor.dispatchers[i];
            if(b.isSelectable())
                DragSelector.select(b);
        }
    }
});

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
}

Class.define(KeyboardHandler, [EventDispatcher], {
    _keydownHandler:function(e)
    {
        if([KeyboardHandler.LEFT, KeyboardHandler.RIGHT, KeyboardHandler.TOP, KeyboardHandler.BOTTOM].indexOf(e.keyCode)>-1)
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
        var ref = this;
        var t = ref.states;
        ref.states = {};
        pKeys.forEach(function(pValue){
            ref.states[pValue] = true;
        });
        this.triggerShortcuts();
        ref.states = t;
    },
    triggerShortcuts:function()
    {
        if(Object.keys(this.states).length === 0 && this.states.constructor === Object)
        {
            return;
        }
        var shortcutInfo;
        var trigger, k, maxk, key;
        for(var i = 0, max = this.shortcuts.length; i<max; i++)
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

function TreeEditor(pContainer)
{
    this.removeAllEventListener();
    this.container = document.querySelector(pContainer);
    this.dispatchers = {};
    this.links = {};
    this.last_block = "";
    this.svg = this.container.querySelector("svg");
    this.initTree();
    this.keyboardHandler = new KeyboardHandler();

    var propertiesEditor = this.container.querySelector(".properties_editor");

    this.propertiesEditor = new PropertiesEditor(propertiesEditor, this);
    propertiesEditor.querySelector("#toggle_ui").addEventListener("click", this.toggleFrozenStatus.proxy(this), false);
    this.keyboardHandler.addShortcut([KeyboardHandler.CTRL, KeyboardHandler.V], this.cloneStash.proxy(this));
    this.keyboardHandler.addShortcut([KeyboardHandler.CTRL, KeyboardHandler.C], this.fillStash.proxy(this));
    this.keyboardHandler.addShortcut([KeyboardHandler.DELETE], this.deleteBlocks.proxy(this));

    this.selector = new DragSelector(this);
}

Class.define(TreeEditor, [EventDispatcher],
{
    initTree:function()
    {
        var ref = this;
        this.svg.querySelectorAll('g[data-role="block"]').forEach(function(pElement){
            ref.dispatchers[pElement.getAttribute("id")] = new Block(pElement, ref);
            ref.last_block = pElement.getAttribute("id");
        });

        var s = {};
        this.svg.querySelectorAll("line.segment").forEach(function(pElement)
        {
            var id = pElement.getAttribute("id");
            var anchors_id = id.split("_");
            var anchor1 = anchors_id[1];
            var anchor2 = anchors_id[2];

            var el1 = ref.svg.querySelector("#"+anchor1);
            var el2 = ref.svg.querySelector("#"+anchor2);

            var seg;

            if(!el1.getAttribute("data-shared")||el1.getAttribute("data-shared") !== "true")
            {
                var block1 = el1.getAttribute("data-draggable").split(";")[0].replace("restraintTo:", "").split(",")[0];
                seg = {
                    "blocks":[block1],
                    "segments":[[anchor1, anchor2]]
                };
            }
            else
            {
                seg = s[anchor1];
                seg.segments.push([anchor1, anchor2]);
                //anchor1 shared
            }

            if(!el2.getAttribute("data-shared")||el2.getAttribute("data-shared") !== "true")
            {
                var block2 = el2.getAttribute("data-draggable").split(";")[0].replace("restraintTo:", "").split(",")[0];
                seg.blocks.push(block2);
                s[anchor1] = seg;
            }
            else
            {
                //anchor2 shared
                s[anchor2] = seg;
                delete s[anchor1];
            }
        });

        var link_obj, k, segment_arr, segments, maxk;
        for(var i in s)
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
    suspend:function()
    {
        //Todo : implémenter la possibilité de mettre en pause les écoutes sur les évènements
    },
    resume:function()
    {
        //Todo : implémenter la possibiliter de reprendre les écoutes sur les évènements
    },
    deleteBlocks:function()
    {
        var ref = this;
        this.selector.selectedElements().forEach(function(pElement){
            ref.dispatchers[pElement.getAttribute("id")].remove();
        });
    },
    getNextBlockIndex:function()
    {
        var selector = 'g[data-role="block"]:last-of-type';
        return (this.svg.querySelector(selector)?Number(this.svg.querySelector(selector).getAttribute("id").split("-")[1])+ 1:1);
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
        var newSelection = [];
        var ref = this;
        var block, newGroup, newBlock, newIndex;
        TreeEditor.stash.forEach(function(pElement)
        {
            block = ref.dispatchers[pElement.getAttribute("id")];
            newIndex = ref.getNextBlockIndex();
            newGroup = pElement.cloneNode(true);
            newGroup.setAttribute("id", GROUP_BASE_ID+newIndex);
            ref.svg.appendChild(newGroup);

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
        var scroll = this.getScroll();
        var dimensions = {width:200, height:75};
        var previous = this.dispatchers[this.last_block];

        var index = this.getNextBlockIndex();
        var g = SVGElement.create("g", {
            "transform":"translate("+(scroll.x + previous.getX()+(previous.getWidth()>>1) - (dimensions.width>>1))+","+( scroll.y + previous.getY()+previous.getHeight()+30)+")",
            "id":GROUP_BASE_ID+index,
            "data-role":"block",
            "data-type":"diagnostic"
        });

        var rect = SVGElement.create("rect", {"width":dimensions.width, "height":dimensions.height}, g);

        var fo = SVGElement.create("foreignObject", {"width":dimensions.width-20, "height":dimensions.height-20, "x":10, "y":10}, g);

        var cache = Element.create("div", {"class":"cache"}, fo);
        Element.create("div", {"data-name":"title", "data-type":"string", "contenteditable":"true", "innerHTML":"Titre "+index}, cache);
        Element.create("div", {"data-name":"description", "data-type":"html", "contenteditable":"true", "innerHTML":"Editer la description"}, cache);

        this.svg.appendChild(g);

        this.dispatchers[g.getAttribute("id")] = new Block(g, this);

        this.createLink(this.last_block, g.getAttribute("id"));

        this.dispatchers[g.getAttribute("id")].select();
    },
    getScroll:function()
    {
        var scroll = {x:0, y:0};
        var p = this.svg;
        while(p)
        {
            scroll.x += p.scrollLeft||0;
            scroll.y += p.scrollTop||0;
            p = p.parentNode;
        }
        return scroll;
    },
    toggleFrozenStatus:function(e)
    {
        var t = e.currentTarget;
        this.svg.classList.toggle("frozen");
        t.querySelector(".label").innerHTML = (this.svg.classList.contains("frozen")?"D&eacute;bloquer":"Bloquer")+" l'interface";
        t.querySelector(".material-icons").innerHTML = (this.svg.classList.contains("frozen")?"&#xE899;":"&#xE898;");
    },
    isFrozen:function()
    {
        return this.svg.classList.contains("frozen");
    },
    deselectAll:function()
    {
        this.selector.deselectAll();
    }
});

TreeEditor.create = function(pSelector)
{
    return new TreeEditor(pSelector);
};

TreeEditor.stash = [];

NodeList.prototype.forEach = Array.prototype.forEach;