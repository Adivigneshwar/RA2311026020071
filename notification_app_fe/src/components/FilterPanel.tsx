// FilterPanel component - allows users to filter by type and search
// Responsive controls for querying notifications

import React, { FC, ReactElement, ChangeEvent } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  useMediaQuery,
  useTheme,
  Paper,
  Theme,
  SelectChangeEvent,
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';

interface FilterPanelProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  selectedType: string | null;
  onTypeChange: (type: string | null) => void;
  availableTypes: string[];
  onClearFilters: () => void;
}

const FilterPanel: FC<FilterPanelProps> = ({
  searchValue,
  onSearchChange,
  selectedType,
  onTypeChange,
  availableTypes,
  onClearFilters,
}): ReactElement => {
  const theme: Theme = useTheme();
  const isMobileScreen: boolean = useMediaQuery(theme.breakpoints.down('sm'));

  const hasActiveFilters: boolean = searchValue.trim() !== '' || selectedType !== null;

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>): void => {
    onSearchChange(e.target.value);
  };

  const handleTypeChange = (e: SelectChangeEvent<string>): void => {
    onTypeChange(e.target.value || null);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        padding: 2,
        marginBottom: 3,
        backgroundColor: theme.palette.background.default,
        borderRadius: theme.shape.borderRadius,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          flexDirection: isMobileScreen ? 'column' : 'row',
          alignItems: isMobileScreen ? 'stretch' : 'flex-end',
        }}
      >
        <TextField
          placeholder="Search by message or ID..."
          value={searchValue}
          onChange={handleSearchChange}
          size="small"
          fullWidth={isMobileScreen}
          sx={{ flex: isMobileScreen ? 1 : 2 }}
          variant="outlined"
        />

        <FormControl size="small" sx={{ flex: isMobileScreen ? 1 : 1, minWidth: 150 }}>
          <InputLabel>Notification Type</InputLabel>
          <Select
            value={selectedType || ''}
            onChange={handleTypeChange}
            label="Notification Type"
          >
            <MenuItem value="">Show All</MenuItem>
            {availableTypes.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="outlined"
          startIcon={<ClearIcon />}
          onClick={onClearFilters}
          disabled={!hasActiveFilters}
          sx={{ flex: isMobileScreen ? 1 : 0 }}
        >
          {isMobileScreen ? 'Clear' : 'Clear Filters'}
        </Button>
      </Box>
    </Paper>
  );
};

export default FilterPanel;
