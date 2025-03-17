// src/components/TemplateEditor.js
import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Text, Image, Transformer } from 'react-konva';
import { v4 as uuidv4 } from 'uuid';
import './TemplateEditor.css';

const TemplateEditor = () => {
  const [template, setTemplate] = useState({
    id: uuidv4(),
    name: 'Untitled Template',
    orientation: 'landscape',
    size: 'A4',
    background: '#ffffff',
    elements: []
  });
  
  const [selectedElement, setSelectedElement] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [previewMode, setPreviewMode] = useState(false);
  const [sampleData, setSampleData] = useState({
    name: 'John Doe',
    course: 'Web Development Masterclass',
    date: 'June 15, 2023',
    issuer: 'Tech Academy'
  });
  
  const stageRef = useRef(null);
  const transformerRef = useRef(null);
  
  // Calculate canvas dimensions based on A4 size and orientation
  const getCanvasDimensions = () => {
    // A4 in points: 595 x 842
    return template.orientation === 'landscape' 
      ? { width: 842, height: 595 } 
      : { width: 595, height: 842 };
  };
  
  const dimensions = getCanvasDimensions();
  
  useEffect(() => {
    if (selectedElement && transformerRef.current) {
      // Find the Konva node by id
      const node = stageRef.current.findOne(`#${selectedElement.id}`);
      if (node) {
        transformerRef.current.nodes([node]);
        transformerRef.current.getLayer().batchDraw();
      }
    }
  }, [selectedElement]);
  
  const handleElementSelect = (element) => {
    setSelectedElement(element);
  };
  
  const handleElementChange = (id, newProps) => {
    setTemplate({
      ...template,
      elements: template.elements.map(el => 
        el.id === id ? { ...el, ...newProps } : el
      )
    });
  };
  
  const addTextElement = () => {
    const newElement = {
      id: uuidv4(),
      type: 'text',
      x: dimensions.width / 2 - 100,
      y: dimensions.height / 2,
      width: 200,
      height: 30,
      text: 'New Text',
      fontSize: 20,
      fontFamily: 'Arial',
      fill: '#000000',
      align: 'center',
      isDynamic: false,
      dynamicField: null
    };
    
    setTemplate({
      ...template,
      elements: [...template.elements, newElement]
    });
    setSelectedElement(newElement);
  };
  
  const addImageElement = (imageUrl) => {
    const img = new window.Image();
    img.src = imageUrl;
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      const newWidth = 200;
      const newHeight = newWidth / aspectRatio;
      
      const newElement = {
        id: uuidv4(),
        type: 'image',
        x: dimensions.width / 2 - newWidth / 2,
        y: dimensions.height / 2 - newHeight / 2,
        width: newWidth,
        height: newHeight,
        src: imageUrl
      };
      
      setTemplate({
        ...template,
        elements: [...template.elements, newElement]
      });
      setSelectedElement(newElement);
    };
  };
  
  const addSignatureField = () => {
    const newElement = {
      id: uuidv4(),
      type: 'signature',
      x: dimensions.width / 2 - 100,
      y: dimensions.height - 150,
      width: 200,
      height: 80,
      label: 'Signature',
      fontSize: 16,
      fontFamily: 'Arial',
      fill: '#000000'
    };
    
    setTemplate({
      ...template,
      elements: [...template.elements, newElement]
    });
    setSelectedElement(newElement);
  };
  
  const addDynamicField = (fieldName) => {
    const newElement = {
      id: uuidv4(),
      type: 'text',
      x: dimensions.width / 2 - 100,
      y: dimensions.height / 2,
      width: 200,
      height: 30,
      text: `{{${fieldName}}}`,
      fontSize: 20,
      fontFamily: 'Arial',
      fill: '#000000',
      align: 'center',
      isDynamic: true,
      dynamicField: fieldName
    };
    
    setTemplate({
      ...template,
      elements: [...template.elements, newElement]
    });
    setSelectedElement(newElement);
  };
  
  const deleteSelectedElement = () => {
    if (!selectedElement) return;
    
    setTemplate({
      ...template,
      elements: template.elements.filter(el => el.id !== selectedElement.id)
    });
    setSelectedElement(null);
  };
  
  const saveTemplate = async () => {
    try {
      const response = await fetch('/.netlify/functions/save-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(template)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save template');
      }
      
      const data = await response.json();
      alert(`Template saved successfully! ID: ${data.templateId}`);
    } catch (error) {
      console.error('Error saving template:', error);
      alert(`Error saving template: ${error.message}`);
    }
  };
  
  const renderElement = (element) => {
    if (previewMode && element.isDynamic) {
      // Replace dynamic field with sample data in preview mode
      const fieldValue = sampleData[element.dynamicField] || `{{${element.dynamicField}}}`;
      element = { ...element, text: fieldValue };
    }
    
    switch (element.type) {
      case 'text':
        return (
          <Text
            key={element.id}
            id={element.id}
            x={element.x}
            y={element.y}
            width={element.width}
            height={element.height}
            text={element.text}
            fontSize={element.fontSize}
            fontFamily={element.fontFamily}
            fill={element.fill}
            align={element.align}
            draggable={!previewMode}
            onClick={() => !previewMode && handleElementSelect(element)}
            onTap={() => !previewMode && handleElementSelect(element)}
            onDragEnd={(e) => {
              handleElementChange(element.id, {
                x: e.target.x(),
                y: e.target.y()
              });
            }}
            onTransform={(e) => {
              const node = e.target;
              handleElementChange(element.id, {
                x: node.x(),
                y: node.y(),
                width: node.width() * node.scaleX(),
                height: node.height() * node.scaleY(),
                scaleX: 1,
                scaleY: 1
              });
            }}
          />
        );
        
      case 'image':
        return (
          <Image
            key={element.id}
            id={element.id}
            x={element.x}
            y={element.y}
            width={element.width}
            height={element.height}
            image={new window.Image()}
            draggable={!previewMode}
            onClick={() => !previewMode && handleElementSelect(element)}
            onTap={() => !previewMode && handleElementSelect(element)}
            onDragEnd={(e) => {
              handleElementChange(element.id, {
                x: e.target.x(),
                y: e.target.y()
              });
            }}
            onTransform={(e) => {
              const node = e.target;
              handleElementChange(element.id, {
                x: node.x(),
                y: node.y(),
                width: node.width() * node.scaleX(),
                height: node.height() * node.scaleY(),
                scaleX: 1,
                scaleY: 1
              });
            }}
          />
        );
        
      case 'signature':
        return (
          <React.Fragment key={element.id}>
            <Rect
              id={element.id}
              x={element.x}
              y={element.y}
              width={element.width}
              height={element.height}
              stroke="#aaaaaa"
              strokeWidth={1}
              dash={[5, 5]}
              fill="transparent"
              draggable={!previewMode}
              onClick={() => !previewMode && handleElementSelect(element)}
              onTap={() => !previewMode && handleElementSelect(element)}
              onDragEnd={(e) => {
                handleElementChange(element.id, {
                  x: e.target.x(),
                  y: e.target.y()
                });
              }}
              onTransform={(e) => {
                const node = e.target;
                handleElementChange(element.id, {
                  x: node.x(),
                  y: node.y(),
                  width: node.width() * node.scaleX(),
                  height: node.height() * node.scaleY(),
                  scaleX: 1,
                  scaleY: 1
                });
              }}
            />
            <Text
              x={element.x}
              y={element.y + element.height + 5}
              width={element.width}
              text={element.label}
              fontSize={element.fontSize}
              fontFamily={element.fontFamily}
              fill={element.fill}
              align="center"
            />
          </React.Fragment>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="template-editor">
      <div className="editor-header">
        <input
          type="text"
          value={template.name}
          onChange={(e) => setTemplate({ ...template, name: e.target.value })}
          className="template-name-input"
        />
        <div className="editor-controls">
          <button onClick={() => setPreviewMode(!previewMode)}>
            {previewMode ? 'Edit Mode' : 'Preview Mode'}
          </button>
          <button onClick={saveTemplate}>Save Template</button>
        </div>
      </div>
      
      <div className="editor-workspace">
        <div className="editor-toolbar">
          <div className="toolbar-section">
            <h3>Add Elements</h3>
            <button onClick={addTextElement}>Add Text</button>
            <button onClick={() => document.getElementById('image-upload').click()}>
              Add Image
            </button>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    addImageElement(event.target.result);
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
            <button onClick={addSignatureField}>Add Signature Field</button>
          </div>
          
          <div className="toolbar-section">
            <h3>Dynamic Fields</h3>
            <button onClick={() => addDynamicField('name')}>Add Name Field</button>
            <button onClick={() => addDynamicField('course')}>Add Course Field</button>
            <button onClick={() => addDynamicField('date')}>Add Date Field</button>
            <button onClick={() => addDynamicField('issuer')}>Add Issuer Field</button>
          </div>
          
          {selectedElement && (
            <div className="toolbar-section">
              <h3>Element Properties</h3>
              {selectedElement.type === 'text' && (
                <>
                  <div className="property-group">
                    <label>Text:</label>
                    <textarea
                      value={selectedElement.text}
                      onChange={(e) => handleElementChange(selectedElement.id, { text: e.target.value })}
                    />
                  </div>
                  <div className="property-group">
                    <label>Font Size:</label>
                    <input
                      type="number"
                      value={selectedElement.fontSize}
                      onChange={(e) => handleElementChange(selectedElement.id, { fontSize: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="property-group">
                    <label>Font Family:</label>
                    <select
                      value={selectedElement.fontFamily}
                      onChange={(e) => handleElementChange(selectedElement.id, { fontFamily: e.target.value })}
                    >
                      <option value="Arial">Arial</option>
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Courier New">Courier New</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Verdana">Verdana</option>
                    </select>
                  </div>
                  <div className="property-group">
                    <label>Color:</label>
                    <input
                      type="color"
                      value={selectedElement.fill}
                      onChange={(e) => handleElementChange(selectedElement.id, { fill: e.target.value })}
                    />
                  </div>
                  <div className="property-group">
                    <label>Alignment:</label>
                    <select
                      value={selectedElement.align}
                      onChange={(e) => handleElementChange(selectedElement.id, { align: e.target.value })}
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                </>
              )}
              
              {selectedElement.type === 'signature' && (
                <>
                  <div className="property-group">
                    <label>Label:</label>
                    <input
                      type="text"
                      value={selectedElement.label}
                      onChange={(e) => handleElementChange(selectedElement.id, { label: e.target.value })}
                    />
                  </div>
                  <div className="property-group">
                    <label>Font Size:</label>
                    <input
                      type="number"
                      value={selectedElement.fontSize}
                      onChange={(e) => handleElementChange(selectedElement.id, { fontSize: parseInt(e.target.value) })}
                    />
                  </div>
                </>
              )}
              
              <button className="delete-button" onClick={deleteSelectedElement}>
                Delete Element
              </button>
            </div>
          )}
          
          <div className="toolbar-section">
            <h3>Canvas Settings</h3>
            <div className="property-group">
              <label>Background Color:</label>
              <input
                type="color"
                value={template.background}
                onChange={(e) => setTemplate({ ...template, background: e.target.value })}
              />
            </div>
            <div className="property-group">
              <label>Orientation:</label>
              <select
                value={template.orientation}
                onChange={(e) => setTemplate({ ...template, orientation: e.target.value })}
              >
                <option value="landscape">Landscape</option>
                <option value="portrait">Portrait</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="canvas-container">
          <Stage
            width={dimensions.width}
            height={dimensions.height}
            ref={stageRef}
            onMouseDown={(e) => {
              // Deselect when clicking on empty area
              if (e.target === e.target.getStage()) {
                setSelectedElement(null);
              }
            }}
          >
            <Layer>
              <Rect
                x={0}
                y={0}
                width={dimensions.width}
                height={dimensions.height}
                fill={template.background}
              />
              
              {template.elements.map(renderElement)}
              
              {!previewMode && selectedElement && (
                <Transformer
                  ref={transformerRef}
                  boundBoxFunc={(oldBox, newBox) => {
                    // Limit minimum size
                    if (newBox.width < 10 || newBox.height < 10) {
                      return oldBox;
                    }
                    return newBox;
                  }}
                />
              )}
            </Layer>
          </Stage>
        </div>
      </div>
      
      {previewMode && (
        <div className="preview-controls">
          <h3>Sample Data</h3>
          <div className="sample-data-form">
            <div className="form-group">
              <label>Name:</label>
              <input
                type="text"
                value={sampleData.name}
                onChange={(e) => setSampleData({ ...sampleData, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Course:</label>
              <input
                type="text"
                value={sampleData.course}
                onChange={(e) => setSampleData({ ...sampleData, course: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Date:</label>
              <input
                type="text"
                value={sampleData.date}
                onChange={(e) => setSampleData({ ...sampleData, date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Issuer:</label>
              <input
                type="text"
                value={sampleData.issuer}
                onChange={(e) => setSampleData({ ...sampleData, issuer: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateEditor;