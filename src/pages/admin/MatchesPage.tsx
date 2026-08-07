import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const MatchesPage = () => {
  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Match Management</h1>
        <Link to="/admin/matches/new">
          <Button>Create Match</Button>
        </Link>
      </div>
      <p>Match list will appear here...</p>
    </div>
  );
};

export default MatchesPage;
