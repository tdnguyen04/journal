'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { savePreferences, getPreferences } from '../actions';
import { toast } from 'sonner';

export function PreferencesForm() {
  const [preferences, setPreferences] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);

  useEffect(() => {
    // Load existing preferences on mount
    const loadPreferences = async () => {
      try {
        const existingPreferences = await getPreferences();
        if (existingPreferences) {
          setPreferences(existingPreferences);
        }
      } catch (error) {
        console.error('Failed to load preferences:', error);
      } finally {
        setIsLoadingInitial(false);
      }
    };

    loadPreferences();
  }, []);

  const handleSave = async () => {
    if (!preferences.trim()) {
      toast.error('Preferences cannot be empty', {
        description: 'Please enter your preferences.',
      });
      return;
    }

    setIsLoading(true);
    const result = await savePreferences(preferences);
    setIsLoading(false);

    if (result.success) {
      toast.success('Preferences saved', {
        description: 'Your preferences have been saved successfully.',
      });
    } else {
      toast.error('Failed to save preferences', {
        description: result.message || 'Please try again later.',
      });
    }
  };

  if (isLoadingInitial) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Preferences</CardTitle>
        <CardDescription>
          Describe what you care about tracking in your journal. For example: &quot;I care about gym stats (weight/reps), my mood, and how many pages I read&quot;
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="preferences">Preferences</Label>
          <Textarea
            id="preferences"
            placeholder="I care about gym stats (weight/reps), my mood, and how many pages I read"
            className="min-h-[120px] resize-none"
            value={preferences}
            onChange={(e) => setPreferences(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                handleSave();
              }
            }}
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isLoading || !preferences.trim()}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Preferences'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

