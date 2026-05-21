# Task 2: Add Batch Operations to LibraryView

## Agent: library-batch-ops

## Summary
Added complete batch selection and batch delete functionality to the LibraryView (素材管理) component.

## Changes Made

### File Modified: `/home/z/my-project/src/components/views/library-view.tsx`

1. **New Imports** (lines 77-78, 84):
   - `CheckSquare`, `Square` from `lucide-react`
   - `Checkbox` from `@/components/ui/checkbox`

2. **New State Variables** (lines 263-267):
   - `batchMode: boolean` - toggles batch selection mode
   - `selectedIds: Set<string>` - tracks selected asset IDs
   - `batchDeleteDialogOpen: boolean` - controls batch delete confirmation dialog
   - `batchDeleting: boolean` - loading state during batch deletion

3. **Batch Toggle Button** (lines 729-748):
   - Added in toolbar after Sort dropdown
   - Rose-colored active state when batch mode is on
   - Text: "批量选择" / "退出批量"
   - Clears selections when exiting batch mode

4. **Modified AssetCard** (lines 1415-1567):
   - Added props: `batchMode?`, `isSelected?`, `onToggleSelect?`
   - Checkbox overlay in top-right corner when in batch mode
   - Rose ring border on selected cards
   - Click behavior: toggles selection in batch mode, opens detail otherwise

5. **Modified AssetRow** (lines 1571-1700+):
   - Added props: `batchMode?`, `isSelected?`, `onToggleSelect?`
   - Checkbox column prepended when in batch mode
   - Rose left-border highlight and background on selected rows
   - Dynamic grid-cols based on batch mode

6. **Updated Grid/List Rendering** (lines 842-904):
   - Pass batchMode, isSelected, onToggleSelect to all AssetCard/AssetRow instances
   - Selection toggle uses Set with add/delete

7. **Floating Batch Action Toolbar** (lines 1301-1353):
   - Fixed bottom-center position with backdrop blur
   - Shows when batchMode && selectedIds.size > 0
   - Contains: count indicator, 全选/取消全选, 批量删除, 取消

8. **Batch Delete Confirmation Dialog** (lines 1355-1408):
   - Shows selected count
   - Sequential DELETE for each asset
   - Progress indicator with spinner
   - Success/failure toast feedback
   - Auto-exits batch mode after completion

## Key Design Decisions
- Used `Set<string>` for O(1) lookup of selected IDs
- Batch mode click behavior replaces normal click (no detail dialog in batch mode)
- Floating toolbar only appears when items are selected
- Sequential (not parallel) deletion for reliability and progress tracking
