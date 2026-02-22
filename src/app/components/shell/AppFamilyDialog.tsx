import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import {
  Alert,
  Avatar,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import type { AppShellModel } from '../../hooks/useAppController'

type AppFamilyDialogProps = {
  model: AppShellModel
}

export function AppFamilyDialog({ model }: AppFamilyDialogProps) {
  return (
    <Dialog
      open={model.isFamilyDialogOpen}
      onClose={model.onCloseFamilyDialog}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>Моя семья</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Stack spacing={0.5}>
            <Typography variant="subtitle1" fontWeight={600}>
              {model.family?.name ?? 'Семья'}
            </Typography>
            {model.family?.code ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  Код: {model.family.code}
                </Typography>
                <Tooltip title="Скопировать код">
                  <span>
                    <IconButton
                      size="small"
                      onClick={model.onCopyFamilyCode}
                      disabled={!model.family?.code || model.isCopyingFamilyCode}
                      aria-label="Скопировать код семьи"
                    >
                      <ContentCopyRounded fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            ) : null}
          </Stack>

          {model.familyMembersError ? (
            <Alert severity="error">{model.familyMembersError}</Alert>
          ) : null}

          {model.familyMembersLoading ? (
            <Stack alignItems="center" sx={{ py: 3 }}>
              <CircularProgress size={28} />
            </Stack>
          ) : model.familyMembersError ? null : model.familyMembers.length === 0 ? (
            <Alert severity="info">Пока нет участников.</Alert>
          ) : (
            <List disablePadding>
              {model.familyMembers.map((member, index) => {
                const isOwnerMember = member.role === 'owner'
                const isSelf = member.userId === model.authUser?.id
                const canRemove = Boolean(
                  model.isOwner && !isOwnerMember && !isSelf && !model.isReadOnly,
                )
                const displayEmail = member.email ?? 'Без почты'
                const initial = (member.email ?? member.userId).slice(0, 1).toUpperCase()

                return (
                  <ListItem
                    key={member.userId}
                    divider={index < model.familyMembers.length - 1}
                    sx={{ alignItems: 'center', py: 1.5 }}
                  >
                    <ListItemIcon sx={{ minWidth: 48 }}>
                      <Avatar src={member.avatarUrl ?? undefined} alt={displayEmail}>
                        {initial}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      sx={{ mr: 2, minWidth: 0 }}
                      primary={(
                        <Typography
                          variant="body1"
                          fontWeight={600}
                          noWrap
                          title={displayEmail}
                        >
                          {displayEmail}
                        </Typography>
                      )}
                      secondary={undefined}
                    />
                    <Stack
                      direction="column"
                      spacing={0.5}
                      alignItems="center"
                      sx={{ ml: 'auto' }}
                    >
                      {isOwnerMember ? (
                        <Typography component="span" sx={{ fontSize: 18 }} aria-label="Владелец">
                          👑
                        </Typography>
                      ) : null}
                      {canRemove ? (
                        <Tooltip title="Исключить">
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => model.onRemoveMember(member)}
                              disabled={model.isReadOnly || model.removingMemberId === member.userId}
                              aria-label="Исключить участника"
                            >
                              <DeleteOutlineRounded fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      ) : null}
                    </Stack>
                  </ListItem>
                )
              })}
            </List>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={model.onCloseFamilyDialog}>Закрыть</Button>
      </DialogActions>
    </Dialog>
  )
}
