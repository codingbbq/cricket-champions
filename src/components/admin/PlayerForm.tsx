import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { collection, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useState } from 'react';

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Player } from "@/types";
import { db, storage } from "@/lib/firebase";
import { Progress } from "@/components/ui/progress";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  role: z.enum(["batsman", "bowler", "all-rounder", "wicket-keeper"]),
  photo: z.any().optional(),
});

interface PlayerFormProps {
  player?: Player | null;
  onFormSubmit: () => void;
}

export function PlayerForm({ player, onFormSubmit }: PlayerFormProps) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: player?.name || "",
      role: player?.role || "batsman",
    },
  });

  const { formState: { isSubmitting } } = form;

    async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsUploading(true);
    let photoUrl = player?.photoUrl || '';

    // Handle file upload
    if (values.photo && values.photo.length > 0) {
      const file = values.photo[0];
      const storageRef = ref(storage, `player_photos/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          },
          (error) => {
            console.error("Upload failed: ", error);
            setIsUploading(false);
            // TODO: Show an error toast
            reject(error);
          },
          async () => {
            photoUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve();
          }
        );
      });
    }

    try {
      if (player) {
        // Update existing player
                const playerRef = doc(db, "players", player.id);
        await updateDoc(playerRef, { 
          name: values.name,
          role: values.role,
          photoUrl,
        });
      } else {
        // Create new player
                await addDoc(collection(db, "players"), {
          name: values.name,
          role: values.role,
          photoUrl,
          active: true,
          createdAt: serverTimestamp(),
        });
      }
      form.reset();
      onFormSubmit(); // To close the dialog
    } catch (error) {
            console.error("Error saving player: ", error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      // TODO: Show an error toast to the user
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Player Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="batsman">Batsman</SelectItem>
                  <SelectItem value="bowler">Bowler</SelectItem>
                  <SelectItem value="all-rounder">All-Rounder</SelectItem>
                  <SelectItem value="wicket-keeper">Wicket-Keeper</SelectItem>
                </SelectContent>
              </Select>
                            <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="photo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Player Photo</FormLabel>
              <FormControl>
                <Input type="file" accept="image/*" onChange={(e) => field.onChange(e.target.files)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {isUploading && <Progress value={uploadProgress} className="w-full" />}
        <Button type="submit" disabled={isSubmitting || isUploading}>
          {isSubmitting ? 'Saving...' : 'Save Player'}
        </Button>
      </form>
    </Form>
  );
}
