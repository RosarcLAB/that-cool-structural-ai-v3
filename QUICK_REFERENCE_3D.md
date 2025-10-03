# Quick Reference: 3D Interactive Features

## 🎮 Controls & Shortcuts

### Mouse Controls
| Action | Drawing Mode OFF | Drawing Mode ON |
|--------|-----------------|-----------------|
| **Left Click** | Rotate camera | Place drawing point |
| **Right Click** | Pan camera | (Not active) |
| **Right Click on Element** | Open context menu | (Not active) |
| **Scroll Wheel** | Zoom in/out | Zoom in/out |
| **Hover over Element** | Highlight white + pointer cursor | No effect |

### Toolbar Buttons
- **Draw Line** 📏: Toggle drawing mode on/off
- **Cancel** ❌: Exit drawing mode (only visible when drawing)
- **Deselect** ✖️: Clear current selection (only enabled when element selected)

---

## 🎨 Visual Indicators

### Element Colors
| Type | Color | Hex |
|------|-------|-----|
| Beam | Blue | #3b82f6 |
| Joist | Green | #10b981 |
| Column | Red | #ef4444 |
| Lintel | Amber | #f59e0b |
| **Selected** | **Purple** | **#8b5cf6** |
| **Hovered** | **White** | **#ffffff** |

### Support Types
| Fixity | Color | Icon |
|--------|-------|------|
| Pinned | Yellow 🟡 | Sphere + cone |
| Fixed | Red 🔴 | Sphere + cone (emissive) |
| Roller | Green 🟢 | Sphere + cone |

### Nodes
- **Color**: Golden amber 🟡
- **Location**: At element start and end points
- **Purpose**: Connection visualization

---

## 📋 Common Workflows

### Create Element by Drawing
```
1. Click "Draw Line" button
2. Click start point on ground
3. Move mouse (see preview)
4. Click end point
5. Element created automatically
```

### Edit Element Properties
```
1. Right-click element
2. Select "Edit Element"
3. Modify fields in side panel
4. Click "Save Changes"
```

### Duplicate Element
```
1. Right-click element
2. Select "Duplicate"
3. Copy appears 2m to the right
```

### Delete Element
```
1. Right-click element
2. Select "Delete"
3. Confirm deletion
```

### Move Element in 3D
```
1. Right-click element → "Edit Element"
2. Adjust X, Y, Z coordinates
3. Click "Save Changes"
```

### Rotate Element
```
1. Right-click element → "Edit Element"
2. Adjust "Rotation (degrees)"
3. Click "Save Changes"
```

---

## 🔧 Edit Panel Fields

### Basic Information
- **Element Name**: Display name
- **Element Type**: Beam, Joist, Column, Lintel, etc.
- **Span (m)**: Length of element

### Position & Orientation
- **X (m)**: Horizontal position (left-right)
- **Y (m)**: Vertical position (up-down)
- **Z (m)**: Depth position (forward-back)
- **Rotation (degrees)**: Angle around Y-axis

### Read-Only Summaries
- **Section**: Shows section name
- **Supports**: Count and details
- **Applied Loads**: Count of loads

---

## ⌨️ Keyboard Shortcuts (Planned)

| Key | Action |
|-----|--------|
| `Esc` | Cancel drawing / Deselect |
| `Del` | Delete selected element |
| `Ctrl+C` | Copy selected element |
| `Ctrl+V` | Paste element |
| `Ctrl+D` | Duplicate element |
| `Ctrl+Z` | Undo last action |
| `Ctrl+Y` | Redo last action |

*Note: Keyboard shortcuts not yet implemented*

---

## 🚨 Troubleshooting Quick Fixes

### "Drawing mode doesn't work"
- ✅ Check that "Draw Line" button is highlighted/active
- ✅ Ensure you're clicking on the ground plane
- ✅ Camera should be locked (can't rotate)

### "Can't select element"
- ✅ Make sure drawing mode is OFF
- ✅ Click directly on the element (not near it)
- ✅ Check that element is visible (not behind camera)

### "Right-click menu doesn't appear"
- ✅ Ensure you're right-clicking ON the element (it should be highlighted)
- ✅ Drawing mode must be OFF
- ✅ Try again with slower, deliberate right-click

### "Edit panel not saving"
- ✅ Check that all required fields have values
- ✅ Look for validation errors (red borders)
- ✅ Verify element has an ID

### "Element appears at wrong position"
- ✅ Check X, Y, Z values in edit panel
- ✅ Remember: Y=0 is ground level
- ✅ Coordinates are in meters

---

## 📊 Default Values

### New Element via Drawing
```typescript
{
  name: "Element [N]",  // N = count + 1
  type: "Beam",
  span: calculated from line length,
  position: midpoint of drawn line,
  rotation: calculated from line angle,
  section: "200x45 LVL",
  supports: [
    { position: 0, fixity: "Pinned" },
    { position: span, fixity: "Pinned" }
  ]
}
```

### Grid Layout (when no position set)
- **Spacing**: 3 meters between elements
- **Columns**: 5 elements per row
- **Rows**: Automatically calculated

---

## 💡 Pro Tips

1. **Zoom First**: Get a good camera angle before drawing
2. **Snap to Grid**: Click near grid intersections for alignment (mental snap - automatic snap coming soon)
3. **Name Your Elements**: Use descriptive names when editing
4. **Check Span**: Verify the span matches your intent after drawing
5. **Save Often**: Project auto-saves, but check for confirmation
6. **Use Duplicate**: Faster than drawing if you need similar elements
7. **Right-Click is Your Friend**: Most element operations are in the context menu
8. **Watch the Footer**: Shows current mode and controls

---

## 🎯 Best Practices

### Naming Convention
```
[Type]-[Floor]-[Grid]-[Number]
Examples:
  "Beam-L1-A-01"
  "Column-L2-B-03"
  "Joist-RF-C-12"
```

### Positioning Strategy
```
Use consistent coordinate system:
  X: West (-) to East (+)
  Y: Down (-) to Up (+)
  Z: South (-) to North (+)
```

### Workflow Order
```
1. Create elements (drawing)
2. Position elements (edit panel)
3. Add supports
4. Add loads
5. Run analysis
6. Design sections
```

---

## 📞 Support & Help

### Where to Report Issues
- Check browser console for errors (F12)
- Screenshot the issue
- Note the steps to reproduce

### Common Error Messages
| Error | Meaning | Fix |
|-------|---------|-----|
| "Element ID required" | Element missing ID | Reload project |
| "Invalid position" | Coordinates out of bounds | Check X,Y,Z values |
| "Section not found" | Section data missing | Re-select section |

---

**Last Updated**: October 3, 2025  
**Version**: 1.0 - Initial Release
