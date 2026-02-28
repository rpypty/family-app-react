import { useState } from 'react'
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { pluralCategory } from '../lib/categoryUtils'

export type CategoryRowItem = {
  id: string
  label: string
  color?: string
}

type CategoryRowProps = {
  categoryNames?: string[]
  categories?: CategoryRowItem[]
  maxVisible?: number
  onShowAll?: () => void
}

export function CategoryRow({ categoryNames = [], categories, maxVisible = 3, onShowAll }: CategoryRowProps) {
  const [isOpen, setIsOpen] = useState(false)
  const source: CategoryRowItem[] = categories ?? categoryNames.map((name) => ({ id: name, label: name }))
  const visible = source.slice(0, maxVisible)
  const remaining = source.length - visible.length

  const handleShowAll = onShowAll ?? (() => setIsOpen(true))

  return (
    <>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {visible.map((category) => (
          <Chip
            key={category.id}
            label={category.label}
            size="small"
            sx={
              category.color
                ? {
                    borderColor: alpha(category.color, 0.55),
                    bgcolor: alpha(category.color, 0.14),
                  }
                : undefined
            }
          />
        ))}
        {remaining > 0 ? (
          <Chip
            label={`еще ${remaining} ${pluralCategory(remaining)}`}
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
          <DialogTitle>Категории</DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {source.map((category) => (
                <Chip
                  key={category.id}
                  label={category.label}
                  sx={
                    category.color
                      ? {
                          borderColor: alpha(category.color, 0.55),
                          bgcolor: alpha(category.color, 0.14),
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
