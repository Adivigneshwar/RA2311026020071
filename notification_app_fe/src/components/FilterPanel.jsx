// FilterPanel component - allows users to filter by type and search
// Responsive controls for querying notifications

import React from 'react';
import PropTypes from 'prop-types';
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
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';

const FilterPanel = ({
  searchValue,
  onSearchChange,
  selectedType,
  onTypeChange,
  availableTypes,
  onClearFilters,
}) => {
  const theme = useTheme();
  const isMobileScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const hasActiveFilters = searchValue.trim() !== '' || selectedType !== null;

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
          onChange={(e) => onSearchChange(e.target.value)}
          size="small"
          fullWidth={isMobileScreen}
          sx={{ flex: isMobileScreen ? 1 : 2 }}
          variant="outlined"
        />

        <FormControl size="small" sx={{ flex: isMobileScreen ? 1 : 1, minWidth: 150 }}>
          <InputLabel>Notification Type</InputLabel>
          <Select
            value={selectedType || ''}
            onChange={(e) => onTypeChange(e.target.value || null)}
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

FilterPanel.propTypes = {
  searchValue: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  selectedType: PropTypes.string,
  onTypeChange: PropTypes.func.isRequired,
  availableTypes: PropTypes.arrayOf(PropTypes.string).isRequired,
  onClearFilters: PropTypes.func.isRequired,
};

FilterPanel.defaultProps = {
  selectedType: null,
};

export default FilterPanel;
