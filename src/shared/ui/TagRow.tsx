import { useState } from 'react'
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { pluralTag } from '../lib/tagUtils'

export type TagRowItem = {
  id: string
  label: string
  color?: string
}

type TagRowProps = {
  tagNames?: string[]
  tags?: TagRowItem[]
  maxVisible?: number
  onShowAll?: () => void
}

export function TagRow({ tagNames = [], tags, maxVisible = 3, onShowAll }: TagRowProps) {
  const [isOpen, setIsOpen] = useState(false)
  const source: TagRowItem[] = tags ?? tagNames.map((name) => ({ id: name, label: name }))
  const visible = source.slice(0, maxVisible)
  const remaining = source.length - visible.length

  const handleShowAll = onShowAll ?? (() => setIsOpen(true))

  return (
    <>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {visible.map((tag) => (
          <Chip
            key={tag.id}
            label={tag.label}
            size="small"
            sx={
              tag.color
                ? {
                    borderColor: alpha(tag.color, 0.55),
                    bgcolor: alpha(tag.color, 0.14),
                  }
                : undefined
            }
          />
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
              {source.map((tag) => (
                <Chip
                  key={tag.id}
                  label={tag.label}
                  sx={
                    tag.color
                      ? {
                          borderColor: alpha(tag.color, 0.55),
                          bgcolor: alpha(tag.color, 0.14),
                        }
                      : undefined
                  }
                />
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
