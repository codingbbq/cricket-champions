import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const formSchema = z.object({
  venue: z.string().min(3, { message: "Venue must be at least 3 characters." }),
  date: z.date({
    required_error: "A date for the match is required.",
  }),
  overs: z.coerce.number().min(1, { message: "Overs must be at least 1." }).max(50, { message: "Overs cannot exceed 50." }),
  lastManBatting: z.boolean().default(false),
});

type MatchFormValues = z.infer<typeof formSchema>;

const CreateMatchPage = () => {
  const navigate = useNavigate();
  const form = useForm<MatchFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      venue: "",
      overs: 10,
      lastManBatting: false,
    },
  });

  const { formState: { isSubmitting } } = form;

  async function onSubmit(values: MatchFormValues) {
    try {
      const docRef = await addDoc(collection(db, "matches"), {
        ...values,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      navigate(`/admin/matches/${docRef.id}/teams`);
    } catch (error) {
      console.error("Error creating match: ", error);
    }
  }

  return (
    <div className="container mx-auto py-10 flex justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Create New Match</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="venue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Venue</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. National Stadium" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Match Date</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="overs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Overs</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastManBatting"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Last Man Batting</FormLabel>
                      <FormDescription>
                        Allow the last remaining batsman to bat alone.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating Match...' : 'Create Match & Select Teams'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateMatchPage;