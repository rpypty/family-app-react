import { useState } from 'react'
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material'
import { pluralTag } from '../lib/tagUtils'

type TagRowProps = {
  tagNames: string[]
  maxVisible?: number
  onShowAll?: () => void
}

export function TagRow({ tagNames, maxVisible = 3, onShowAll }: TagRowProps) {
  const [isOpen, setIsOpen] = useState(false)
  const visible = tagNames.slice(0, maxVisible)
  const remaining = tagNames.length - visible.length

  const handleShowAll = onShowAll ?? (() => setIsOpen(true))

  return (
    <>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {visible.map((name) => (
          <Chip key={name} label={name} size="small" />
        ))}
        {remaining > 0 ? (
          <Chip
            label={`еще ${remaining} ${pluralTag(remaining)}`}
            size="small"
            variant="outlined"
            onClick={(event) => {
              event.stopPropagation()
              handleShowAll()
            }}
          />
        ) : null}
      </Stack>

      {!onShowAll && (
        <Dialog open={isOpen} onClose={() => setIsOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>Теги</DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {tagNames.map((name) => (
                <Chip key={name} label={name} />
              ))}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button variant="contained" onClick={() => setIsOpen(false)}>
              Готово
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  )
}
