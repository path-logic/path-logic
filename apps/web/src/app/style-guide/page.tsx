'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

export default function StyleGuidePage(): React.JSX.Element {
    return (
        <div className="space-y-12 pb-20">
            {/* Header section */}
            <div className="space-y-2 border-b border-border/50 pb-8">
                <h1 className="text-4xl font-bold tracking-tight text-foreground">Visual Constitution</h1>
                <p className="text-lg text-muted-foreground max-w-2xl">
                    Defining the premium high-density interface for Path Logic.
                </p>
            </div>

            {/* Branding Section */}
            <section className="space-y-6">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-primary rounded-full" />
                    <h2 className="text-xl font-bold uppercase tracking-widest text-foreground">Branding & Identity</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="p-8 flex flex-col items-center justify-center gap-6 border-primary/20 bg-primary/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary rounded-sm flex items-center justify-center shadow-lg shadow-primary/20">
                                <span className="text-primary-foreground font-black text-xl">P</span>
                            </div>
                            <h1 className="text-3xl font-black uppercase tracking-tighter">
                                Path <span className="text-primary">Logic</span>
                            </h1>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">
                            Primary Wordmark Standard
                        </p>
                    </Card>

                    <div className="space-y-4 flex flex-col justify-center">
                        <div className="space-y-1">
                            <Label>Color Split Pattern</Label>
                            <p className="text-sm text-foreground">
                                The word <span className="font-bold">Path</span> uses standard foreground,
                                while <span className="text-primary font-bold">Logic</span> must use the primary brand color.
                            </p>
                        </div>
                        <div className="space-y-1">
                            <Label>Typography</Label>
                            <p className="text-sm text-muted-foreground">
                                Always <span className="uppercase font-bold">Uppercase</span>.
                                Prefer <span className="font-bold">tracking-tighter</span> or <span className="font-bold">tracking-tight</span>.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Typography Section */}
            <section className="space-y-6">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-primary rounded-full" />
                    <h2 className="text-xl font-bold uppercase tracking-widest text-foreground">Typography</h2>
                </div>

                <div className="grid gap-8 border border-border/50 rounded-lg p-8 bg-muted/10">
                    <div className="space-y-1">
                        <Label>H1: Page Title</Label>
                        <p className="text-4xl font-bold tracking-tight">Financial Intelligence</p>
                    </div>
                    <div className="space-y-1">
                        <Label>H2: Section Header</Label>
                        <p className="text-2xl font-bold">Transaction History</p>
                    </div>
                    <div className="space-y-1">
                        <Label>H3: Sub-header</Label>
                        <p className="text-lg font-semibold">Account Details</p>
                    </div>
                    <div className="space-y-1">
                        <Label>Action Label / Small Header</Label>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Original Loan Amount</p>
                    </div>
                    <div className="space-y-1">
                        <Label>Body Text</Label>
                        <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                            Path Logic uses a strictly enforced high-density layout inspired by
                            terminal-based productivity tools. Every pixel must serve a functional purpose.
                        </p>
                    </div>
                    <div className="space-y-1">
                        <Label>Mono Scale (Data)</Label>
                        <p className="font-mono text-sm text-foreground">$12,450.00 / 4.25% APR</p>
                    </div>
                </div>
            </section>

            {/* Containers Section */}
            <section className="space-y-6">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-amber-500 rounded-full" />
                    <h2 className="text-xl font-bold uppercase tracking-widest text-foreground">Containers (Cards)</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Standard Card</CardTitle>
                            <CardDescription>Default container with premium soft shadows and rounded corners.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="p-4 bg-muted/30 rounded-md border border-border/50 text-xs text-muted-foreground italic">
                                &quot;Borders should be subtle (50% opacity) and shadows must use multi-layered RGB values.&quot;
                            </div>
                        </CardContent>
                    </Card>

                    <Card interactive accentColor="bg-blue-500">
                        <CardHeader>
                            <CardTitle>Hoverable Interactive Card</CardTitle>
                            <CardDescription>Expands shadow and translates slightly upwards on hover.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase">
                                <Check className="w-4 h-4" />
                                Interactive State Active
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* Form Elements Section */}
            <section className="space-y-6">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-teal-500 rounded-full" />
                    <h2 className="text-xl font-bold uppercase tracking-widest text-foreground">Form Elements</h2>
                </div>

                <Card className="max-w-xl">
                    <CardHeader>
                        <CardTitle>Data Entry Standard</CardTitle>
                        <CardDescription>Forms should use consistent spacing and h-11 inputs.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-1">
                            <Label>Full Name</Label>
                            <Input placeholder="Enter your full name" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label>Interest Rate</Label>
                                <Input placeholder="3.5" className="font-mono" />
                            </div>
                            <div className="space-y-1">
                                <Label>Due Date</Label>
                                <Input type="date" />
                            </div>
                        </div>
                        <div className="flex gap-3 pt-4">
                            <Button variant="outline" className="flex-1 h-11 font-bold uppercase tracking-widest">Cancel</Button>
                            <Button className="flex-1 h-11 font-bold uppercase tracking-widest">Submit Action</Button>
                        </div>
                    </CardContent>
                </Card>
            </section>

            {/* Interactivity Section */}
            <section className="space-y-6">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-purple-500 rounded-full" />
                    <h2 className="text-xl font-bold uppercase tracking-widest text-foreground">Interactivity & Cursors</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="p-6 space-y-2 relative overflow-hidden group">
                        <Label>Static Text</Label>
                        <div className="h-12 flex items-center justify-center bg-muted/20 rounded text-[10px] font-bold uppercase transition-colors group-hover:bg-muted/30">
                            Default Arrow
                        </div>
                        <p className="text-[10px] text-muted-foreground text-center italic">Headers, Body, Labels</p>
                    </Card>

                    <Card className="p-6 space-y-2">
                        <Label>Action Element</Label>
                        <Button variant="outline" className="w-full h-12 uppercase text-[10px] tracking-widest">
                            Button (Default)
                        </Button>
                        <p className="text-[10px] text-muted-foreground text-center font-bold uppercase tracking-tight">Interactive State</p>
                    </Card>

                    <Card className="p-6 space-y-2">
                        <Label>Navigation</Label>
                        <div className="h-12 flex items-center justify-center bg-primary/10 text-primary rounded text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:bg-primary/20 transition-colors">
                            Pointer Link
                        </div>
                        <p className="text-[10px] text-muted-foreground text-center font-bold uppercase tracking-tight">Navigation State</p>
                    </Card>

                    <Card className="p-6 space-y-2">
                        <Label>Data Entry</Label>
                        <Input placeholder="I-Beam Cursor" className="h-12" />
                        <p className="text-[10px] text-muted-foreground text-center font-bold uppercase tracking-tight">Entry State</p>
                    </Card>
                </div>
            </section>

            {/* Colors & Icons Section */}
            <section className="space-y-6">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-blue-500 rounded-full" />
                    <h2 className="text-xl font-bold uppercase tracking-widest text-foreground">Colors & Status</h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Primary', color: 'bg-primary' },
                        { label: 'Success', color: 'bg-teal-500' },
                        { label: 'Warning', color: 'bg-amber-500' },
                        { label: 'Destructive', color: 'bg-destructive' },
                    ].map((item) => (
                        <Card key={item.label} interactive accentColor={item.color} className="p-6 space-y-3">
                            <div className={`h-10 rounded ${item.color}`} />
                            <p className="text-[10px] font-bold uppercase tracking-widest">{item.label}</p>
                        </Card>
                    ))}
                </div>
            </section>
        </div>
    );
}
