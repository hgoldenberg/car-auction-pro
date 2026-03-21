
ALTER TABLE public.leads ADD COLUMN origin_group_id uuid REFERENCES public.telegram_groups(id);

-- Allow authenticated to update/delete activity_log (for enrichment)
CREATE POLICY "Authenticated users can update activity" ON public.activity_log FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete activity" ON public.activity_log FOR DELETE TO authenticated USING (true);

-- Allow authenticated to update/delete lead_notes
CREATE POLICY "Authenticated users can update lead notes" ON public.lead_notes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete lead notes" ON public.lead_notes FOR DELETE TO authenticated USING (true);
