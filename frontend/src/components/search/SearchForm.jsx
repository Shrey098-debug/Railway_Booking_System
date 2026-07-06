import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StationAutocomplete from './StationAutocomplete';
import Button from '../ui/Button';
import { searchApi } from '../../api/search.api';
import { useSearchStore } from '../../store/search.store';
import { useToast } from '../ui/Toast';

export default function SearchForm({ compact }) {
  const today = new Date().toISOString().split('T')[0];
  const { from, to, date, setSearchParams, setResults, setSearching, isSearching } = useSearchStore();
  const [fromCode, setFromCode] = useState(from);
  const [toCode, setToCode] = useState(to);
  // Default to today so search always resolves a schedule (a train without a
  // schedule for the searched date can't be booked — see search.service.js).
  const [travelDate, setTravelDate] = useState(date || today);
  const navigate = useNavigate();
  const showToast = useToast();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!fromCode || !toCode) {
      showToast('Please select both From and To stations', 'warning');
      return;
    }
    if (!travelDate) {
      showToast('Please pick a travel date', 'warning');
      return;
    }
    setSearchParams(fromCode, toCode, travelDate);
    setSearching(true);

    try {
      const res = await searchApi.search(fromCode, toCode, travelDate);
      setResults(res.data || res);
      navigate('/search');
    } catch (err) {
      showToast(err.message || 'Search failed', 'error');
      setSearching(false);
    }
  };

  return (
    <form onSubmit={handleSearch} className={compact ? 'space-y-3' : ''}>
      <div className={compact ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3' : 'grid grid-cols-1 md:grid-cols-4 gap-4'}>
        <StationAutocomplete
          label="From"
          value={fromCode}
          onChange={(code) => setFromCode(code)}
          placeholder="Enter city or station"
        />
        <StationAutocomplete
          label="To"
          value={toCode}
          onChange={(code) => setToCode(code)}
          placeholder="Enter city or station"
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={travelDate}
            onChange={(e) => setTravelDate(e.target.value)}
            min={today}
            required
            className="input-field"
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" loading={isSearching} className="w-full">
            Search Trains
          </Button>
        </div>
      </div>
    </form>
  );
}
